import { Collection, ChangeStream, ChangeStreamOptions, ObjectId, ResumeToken } from 'mongodb';
import { Server as SocketIOServer } from 'socket.io';
import { SensorReading } from '../types';
import { SensorService } from './SensorService';

// MongoDB error codes signalling change streams are unavailable on this
// deployment (e.g. standalone server or unsupported time-series collection),
// meaning we should fall back to polling permanently rather than retry.
const UNSUPPORTED_ERROR_CODES = new Set([40573, 166]);

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const POLL_INTERVAL_MS = 1000;

type Mode = 'idle' | 'change-stream' | 'polling';

export class ChangeStreamService {
  private changeStream: ChangeStream | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastProcessedId: ObjectId | null = null;
  private resumeToken: ResumeToken | null = null;
  private reconnectAttempts: number = 0;
  private isPolling: boolean = false;
  private stopped: boolean = false;
  private mode: Mode = 'idle';

  constructor(
    private collection: Collection<SensorReading>,
    private sensorService: SensorService,
    private io: SocketIOServer
  ) {}

  async start(): Promise<void> {
    this.stopped = false;
    try {
      await this._startChangeStream();
    } catch (error: any) {
      if (this._isUnsupportedError(error)) {
        console.log('Change streams not supported (replica set or time series limitation). Falling back to polling mode.');
        await this._fallbackToPolling();
      } else {
        throw error;
      }
    }
  }

  private async _startChangeStream(): Promise<void> {
    // A single source of truth: never let polling run alongside a live stream.
    this._stopPolling();

    console.log(`Starting change stream on collection: ${this.collection.collectionName}`);

    // Resume from the last seen token after a transient error so no inserts are
    // missed across the reconnect.
    const options: ChangeStreamOptions = {};
    if (this.resumeToken) options.resumeAfter = this.resumeToken;

    this.changeStream = this.collection.watch(
      [{ $match: { operationType: 'insert' } }],
      options
    );
    this.mode = 'change-stream';

    this.changeStream.on('change', (changeEvent: any) => this._handleChange(changeEvent));
    this.changeStream.on('error', (error: any) => this._handleError(error));

    console.log('✓ Change stream active');
  }

  private async _initializePolling(): Promise<void> {
    // Keep any cursor position carried over from the change stream so a
    // mid-session fallback continues where the stream left off instead of
    // skipping to "now".
    if (this.lastProcessedId) return;

    const latestDoc = await this.collection
      .find()
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (latestDoc.length > 0 && latestDoc[0]._id) {
      this.lastProcessedId = latestDoc[0]._id as ObjectId;
    }
  }

  private _startPolling(): void {
    // Guard against stacking multiple intervals if called more than once.
    if (this.pollingInterval) return;

    this.mode = 'polling';
    console.log('Polling mode active (checking every 1s)');

    this.pollingInterval = setInterval(async () => {
      if (this.isPolling) return;

      this.isPolling = true;
      try {
        await this._pollForNewReadings();
      } catch (error) {
        console.error('Polling error:', error);
      } finally {
        this.isPolling = false;
      }
    }, POLL_INTERVAL_MS);
  }

  private async _pollForNewReadings(): Promise<void> {
    const query = this.lastProcessedId
      ? { _id: { $gt: this.lastProcessedId } }
      : {};

    const newReadings = await this.collection
      .find(query)
      .sort({ _id: 1 })
      .toArray();

    if (newReadings.length > 0) {
      const payloads = newReadings.map(reading => this.sensorService.formatSensorUpdate(reading));
      this.io.emit('sensor-update', payloads);

      const lastReading = newReadings[newReadings.length - 1];
      if (lastReading._id) {
        this.lastProcessedId = lastReading._id as ObjectId;
      }
    }
  }

  private _handleChange(changeEvent: any): void {
    // A live change means the stream is healthy: remember the resume point and
    // reset the backoff counter.
    this.resumeToken = changeEvent._id ?? this.resumeToken;
    if (changeEvent.fullDocument?._id) {
      this.lastProcessedId = changeEvent.fullDocument._id as ObjectId;
    }
    this.reconnectAttempts = 0;

    const newReading: SensorReading = changeEvent.fullDocument;
    const payload = this.sensorService.formatSensorUpdate(newReading);
    this.io.emit('sensor-update', [payload]);
  }

  private _handleError(error: any): void {
    if (this._isUnsupportedError(error)) {
      console.log('Change streams not supported. Switching to polling mode.');
      void this._fallbackToPolling();
      return;
    }

    console.error('Change Stream error:', error);
    void this._reconnectChangeStream();
  }

  /**
   * Re-establish the change stream after a transient error, resuming from the
   * last token with capped exponential backoff. After repeated failures, gives
   * up and falls back to polling so updates keep flowing.
   */
  private async _reconnectChangeStream(): Promise<void> {
    if (this.stopped) return;

    // Close the dead stream first so we never hold two streams at once.
    await this._closeChangeStream();

    // A reconnect is already scheduled; let it run.
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Change stream failed to resume after ${MAX_RECONNECT_ATTEMPTS} attempts; falling back to polling.`);
      await this._fallbackToPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** (this.reconnectAttempts - 1),
      RECONNECT_MAX_DELAY_MS
    );
    console.log(`Reconnecting change stream in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.stopped) return;
      try {
        await this._startChangeStream();
      } catch (error) {
        if (this._isUnsupportedError(error)) {
          await this._fallbackToPolling();
        } else {
          console.error('Change stream reconnect failed:', error);
          void this._reconnectChangeStream();
        }
      }
    }, delay);
  }

  private async _fallbackToPolling(): Promise<void> {
    if (this.mode === 'polling') return;

    // Closing the stream and cancelling pending reconnects guarantees polling
    // is the only active source.
    this._cancelReconnect();
    await this._closeChangeStream();

    await this._initializePolling();
    this._startPolling();
  }

  private _isUnsupportedError(error: any): boolean {
    return UNSUPPORTED_ERROR_CODES.has(error?.code);
  }

  private async _closeChangeStream(): Promise<void> {
    if (!this.changeStream) return;
    const stream = this.changeStream;
    this.changeStream = null;
    try {
      await stream.close();
    } catch {
      // The stream may already be closed/errored; nothing to recover.
    }
  }

  private _stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private _cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this._cancelReconnect();
    this._stopPolling();
    await this._closeChangeStream();
    this.mode = 'idle';
    console.log('Change stream service stopped');
  }
}
