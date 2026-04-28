import { MongoClient, Db, Collection } from 'mongodb';
import { databaseConfig } from '../config/database';
import { SensorReading } from '../types';

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private sensorReadingsCollection: Collection<SensorReading> | null = null;

  async connect(): Promise<boolean> {
    try {
      this.client = new MongoClient(databaseConfig.MONGO_URI);
      await this.client.connect();
      console.log(`Connected to MongoDB at ${databaseConfig.MONGO_URI}`);

      this.db = this.client.db(databaseConfig.DB_NAME);
      this._initializeCollections();

      return true;
    } catch (error) {
      console.error("Connection Failed, check if MongoDB is running:", error);
      throw error;
    }
  }

  private _initializeCollections(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.sensorReadingsCollection = this.db.collection<SensorReading>(
      databaseConfig.COLLECTIONS.SENSOR_READINGS
    );
  }

  getSensorReadingsCollection(): Collection<SensorReading> {
    if (!this.sensorReadingsCollection) {
      throw new Error('Sensor readings collection not initialized');
    }
    return this.sensorReadingsCollection;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }
}

export default new DatabaseService();
