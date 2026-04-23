class ChangeStreamService {
  constructor(collection, sensorService, io) {
    this.collection = collection;
    this.sensorService = sensorService;
    this.io = io;
    this.changeStream = null;
    this.pollingInterval = null;
    this.lastProcessedId = null;
    this.isPolling = false;
  }

  async start() {
    try {
      await this._tryChangeStream();
    } catch (error) {
      if (error.code === 40573) {
        console.log('⚠️  Replica set not configured. Falling back to polling mode.');
        await this._initializePolling();
        this._startPolling();
      } else {
        throw error;
      }
    }
  }

  async _tryChangeStream() {
    console.log(`Starting change stream on collection: ${this.collection.collectionName}`);

    this.changeStream = this.collection.watch([
      { $match: { operationType: 'insert' } }
    ]);

    this.changeStream.on('change', (changeEvent) => this._handleChange(changeEvent));
    this.changeStream.on('error', (error) => this._handleError(error));

    console.log('✓ Change stream active');
  }

  async _initializePolling() {
    // Get the latest document to start polling from
    const latestDoc = await this.collection
      .find()
      .sort({ _id: -1 })
      .limit(1)
      .toArray();

    if (latestDoc.length > 0) {
      this.lastProcessedId = latestDoc[0]._id;
    }
  }

  _startPolling() {
    console.log('✓ Polling mode active (checking every 1s)');

    this.pollingInterval = setInterval(async () => {
      if (this.isPolling) return; // Skip if previous poll still running

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

  async _pollForNewReadings() {
    const query = this.lastProcessedId
      ? { _id: { $gt: this.lastProcessedId } }
      : {};

    const newReadings = await this.collection
      .find(query)
      .sort({ _id: 1 })
      .toArray();

    if (newReadings.length > 0) {
      // Process in order
      for (const reading of newReadings) {
        const payload = this.sensorService.formatSensorUpdate(reading);
        this.io.emit('sensor-update', [payload]);
      }

      // Update cursor to last processed document
      this.lastProcessedId = newReadings[newReadings.length - 1]._id;
    }
  }

  _handleChange(changeEvent) {
    const newReading = changeEvent.fullDocument;
    const payload = this.sensorService.formatSensorUpdate(newReading);
    this.io.emit('sensor-update', [payload]);
  }

  _handleError(error) {
    if (error.code === 40573) {
      console.log('⚠️  Replica set not configured. Switching to polling mode.');
      this._initializePolling().then(() => this._startPolling());
    } else {
      console.error("Change Stream error:", error);
    }
  }

  async stop() {
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

module.exports = ChangeStreamService;
