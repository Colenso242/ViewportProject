import { MongoClient, MongoClientOptions, Db, Collection } from 'mongodb';
import { databaseConfig } from '../config/database';
import { SensorReading, SensorPlacement } from '../types';

// Connection pool + timeout tuning so a slow/unreachable DB fails fast and
// predictably instead of hanging requests indefinitely. retryReads/Writes let
// the driver transparently retry a single operation across a transient blip.
const MONGO_CLIENT_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryReads: true,
  retryWrites: true,
};

// Startup connection retry: a brief DB outage when the server boots shouldn't
// immediately kill the process.
const CONNECT_MAX_ATTEMPTS = 5;
const CONNECT_RETRY_BASE_DELAY_MS = 2000;

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private sensorReadingsCollection: Collection<SensorReading> | null = null;
  private sensorPlacementsCollection: Collection<SensorPlacement> | null = null;

  async connect(): Promise<boolean> {
    for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt++) {
      try {
        this.client = new MongoClient(databaseConfig.MONGO_URI, MONGO_CLIENT_OPTIONS);
        await this.client.connect();
        console.log(`Connected to MongoDB at ${databaseConfig.MONGO_URI}`);

        this.db = this.client.db(databaseConfig.DB_NAME);
        this._initializeCollections();

        return true;
      } catch (error) {
        console.error(`MongoDB connection attempt ${attempt}/${CONNECT_MAX_ATTEMPTS} failed:`, error);
        // Discard the half-open client before retrying so we don't leak it.
        await this.client?.close().catch(() => {});
        this.client = null;

        if (attempt < CONNECT_MAX_ATTEMPTS) {
          const wait = CONNECT_RETRY_BASE_DELAY_MS * attempt;
          console.log(`Retrying MongoDB connection in ${wait}ms...`);
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
      }
    }

    throw new Error(`Failed to connect to MongoDB after ${CONNECT_MAX_ATTEMPTS} attempts. Check that MongoDB is running.`);
  }

  private _initializeCollections(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.sensorReadingsCollection = this.db.collection<SensorReading>(
      databaseConfig.COLLECTIONS.SENSOR_READINGS
    );

    this.sensorPlacementsCollection = this.db.collection<SensorPlacement>(
      databaseConfig.COLLECTIONS.SENSOR_PLACEMENTS
    );
    this.sensorPlacementsCollection.createIndex({ modelId: 1 }).catch((error) => {
      console.error('Failed to create sensor placements index:', error);
    });
    this.sensorPlacementsCollection.createIndex({ placementId: 1 }, { unique: true }).catch((error) => {
      console.error('Failed to create sensor placements unique index:', error);
    });
  }

  getSensorReadingsCollection(): Collection<SensorReading> {
    if (!this.sensorReadingsCollection) {
      throw new Error('Sensor readings collection not initialized');
    }
    return this.sensorReadingsCollection;
  }

  getSensorPlacementsCollection(): Collection<SensorPlacement> {
    if (!this.sensorPlacementsCollection) {
      throw new Error('Sensor placements collection not initialized');
    }
    return this.sensorPlacementsCollection;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }
}

export default new DatabaseService();
