import { Collection, Filter } from 'mongodb';
import { SensorReading, SensorData } from '../types';

export class SensorService {
  constructor(private sensorReadingsCollection: Collection<SensorReading>) {}

  async getLatestReadings(): Promise<SensorData[]> {
    try {
      const latestReadings = await this.sensorReadingsCollection.aggregate<SensorReading>([
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

  async getHistoricalData(sensorId: string, limit: number = 1000, timeRangeMinutes?: number): Promise<SensorData[]> {
    try {
      const query: Filter<SensorReading> = { "metadata.sensorId": sensorId };
      if (timeRangeMinutes) {
        const timeThreshold = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
        query.timestamp = { $gte: timeThreshold };
      }

      const history = await this.sensorReadingsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      // Return in chronological order
      return this._mapToSensorData(history.reverse());
    } catch (error) {
      console.error(`Failed to fetch historical data for ${sensorId}:`, error);
      throw error;
    }
  }

  private _formatReading(reading: SensorReading): SensorData {
    return {
      id: reading.metadata.sensorId,
      type: reading.metadata.sensorType,
      value: reading.value,
      threshold: reading.metadata.threshold,
      unit: reading.metadata.unit,
      isCritical: reading.isCritical,
      isWarning: reading.isWarning,
      timestamp: reading.timestamp
    };
  }

  private _mapToSensorData(readings: SensorReading[]): SensorData[] {
    return readings.map(reading => this._formatReading(reading));
  }

  formatSensorUpdate(document: SensorReading): SensorData {
    return this._formatReading(document);
  }
}
