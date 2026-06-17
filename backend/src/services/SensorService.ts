import { Collection } from 'mongodb';
import { SensorReading, SensorData } from '../types';

// Upper bound on rows returned by a single historical query, guarding against
// unbounded client-supplied limits (e.g. ?limit=99999999).
export const MAX_HISTORY_LIMIT = 10000;
const DEFAULT_HISTORY_LIMIT = 1000;

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

  async getHistoricalData(sensorId: string, limit: number = DEFAULT_HISTORY_LIMIT, timeRangeMinutes?: number): Promise<SensorData[]> {
    try {
      // Defensively clamp: callers may pass through unvalidated client input.
      const safeLimit = Number.isFinite(limit)
        ? Math.min(Math.max(Math.trunc(limit), 1), MAX_HISTORY_LIMIT)
        : DEFAULT_HISTORY_LIMIT;

      const query: any = { "metadata.sensorId": sensorId };
      if (timeRangeMinutes && Number.isFinite(timeRangeMinutes) && timeRangeMinutes > 0) {
        const timeThreshold = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
        query.timestamp = { $gte: timeThreshold };
      }

      const history = await this.sensorReadingsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(safeLimit)
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
