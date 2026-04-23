const { MongoClient } = require('mongodb');
const dbConfig = require('../config/database');

class DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
    this.collections = {};
  }

  async connect() {
    try {
      this.client = new MongoClient(dbConfig.MONGO_URI);
      await this.client.connect();
      console.log(`Connected to MongoDB at ${dbConfig.MONGO_URI}`);

      this.db = this.client.db(dbConfig.DB_NAME);
      this._initializeCollections();

      return true;
    } catch (error) {
      console.error("Connection Failed, check if MongoDB is running:", error);
      throw error;
    }
  }

  _initializeCollections() {
    this.collections.sensorReadings = this.db.collection(dbConfig.COLLECTIONS.SENSOR_READINGS);
    this.collections.sensorReadingsLive = this.db.collection(dbConfig.COLLECTIONS.SENSOR_READINGS_LIVE);
  }

  getCollection(name) {
    return this.collections[name];
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }
}

module.exports = new DatabaseService();
