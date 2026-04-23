import { DatabaseConfig } from '../types';

export const databaseConfig: DatabaseConfig = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017',
  DB_NAME: process.env.DB_NAME || 'iot_digital_twin',
  COLLECTIONS: {
    SENSOR_READINGS: 'sensor_readings',
    SENSOR_READINGS_LIVE: 'sensor_readings_live'
  }
};
