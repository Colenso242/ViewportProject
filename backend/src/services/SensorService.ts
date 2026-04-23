import { Collection } from 'mongodb';
import { SensorReading, SensorData } from '../types';

export class SensorService {
  constructor(private liveCollection: Collection<SensorReading>) {}

  async getLatestReadings(): Promise<SensorData[]> {
    try {
      const latestReadings = await this.liveCollection.aggregate<SensorReading>([
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

  private _mapToSensorData(readings: SensorReading[]): SensorData[] {
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

  formatSensorUpdate(document: SensorReading): SensorData {
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
