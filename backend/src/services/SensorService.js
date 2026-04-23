class SensorService {
  constructor(liveCollection) {
    this.liveCollection = liveCollection;
  }

  async getLatestReadings() {
    try {
      const latestReadings = await this.liveCollection.aggregate([
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$metadata.sensorId",
            doc: { $first: "$$ROOT" }
          }
        },
        { $replaceRoot: { newRoot: "$doc" } }
      ]).toArray();

      return this._mapToSensorData(latestReadings);
    } catch (error) {
      console.error("Failed to fetch latest sensor readings:", error);
      throw error;
    }
  }

  _mapToSensorData(readings) {
    return readings.map(reading => ({
      id: reading.metadata.sensorId,
      type: reading.metadata.sensorType,
      value: reading.value,
      threshold: reading.metadata.threshold,
      unit: reading.metadata.unit,
      isCritical: reading.isCritical,
      timestamp: reading.timestamp
    }));
  }

  formatSensorUpdate(document) {
    return {
      id: document.metadata.sensorId,
      type: document.metadata.sensorType,
      value: document.value,
      threshold: document.metadata.threshold,
      unit: document.metadata.unit,
      isCritical: document.isCritical,
      timestamp: document.timestamp
    };
  }
}

module.exports = SensorService;
