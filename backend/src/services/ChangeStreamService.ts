import { Collection, ChangeStream, ObjectId } from 'mongodb';
import { Server as SocketIOServer } from 'socket.io';
import { SensorReading } from '../types';
import { SensorService } from './SensorService';

export class ChangeStreamService {
  private changeStream: ChangeStream | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedId: ObjectId | null = null;
  private isPolling: boolean = false;

  constructor(
    private collection: Collection<SensorReading>,
    private sensorService: SensorService,
    private io: SocketIOServer
  ) {}

  async start(): Promise<void> {
    try {
      await this._tryChangeStream();
    } catch (error: any) {
      if (error.code === 40573) {
        console.log('⚠️  Replica set not configured. Falling back to polling mode.');
        await this._initializePolling();
        this._startPolling();
      } else {
        throw error;
      }
    }
  }

  private async _tryChangeStream(): Promise<void> {
    console.log(`Starting change stream on collection: ${this.collection.collectionName}`);

    this.changeStream = this.collection.watch([
      { $match: { operationType: 'insert' } }
    ]);

    this.changeStream.on('change', (changeEvent: any) => this._handleChange(changeEvent));
    this.changeStream.on('error', (error: any) => this._handleError(error));

    console.log('✓ Change stream active');
  }

  private async _initializePolling(): Promise<void> {
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
    console.log('✓ Polling mode active (checking every 1s)');

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
    }, 1000);
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
      for (const reading of newReadings) {
        const payload = this.sensorService.formatSensorUpdate(reading);
        this.io.emit('sensor-update', [payload]);
      }

      const lastReading = newReadings[newReadings.length - 1];
      if (lastReading._id) {
        this.lastProcessedId = lastReading._id as ObjectId;
      }
    }
  }

  private _handleChange(changeEvent: any): void {
    const newReading: SensorReading = changeEvent.fullDocument;
    const payload = this.sensorService.formatSensorUpdate(newReading);
    this.io.emit('sensor-update', [payload]);
  }

  private _handleError(error: any): void {
    if (error.code === 40573) {
      console.log('⚠️  Replica set not configured. Switching to polling mode.');
      this._initializePolling().then(() => this._startPolling());
    } else {
      console.error("Change Stream error:", error);
    }
  }

  async stop(): Promise<void> {
    if (this.changeStream) {
      await this.changeStream.close();
      console.log('Change stream closed');
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      console.log('Polling stopped');
    }
  }
}
