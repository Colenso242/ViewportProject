export interface SensorMetadata {
  sensorId: string;
  sensorType: string;
  unit: string;
  threshold: number;
}

export interface SensorReading {
  _id?: any;
  timestamp: Date;
  metadata: SensorMetadata;
  value: number;
  isCritical: boolean;
  isWarning?: boolean;
}

export interface SensorData {
  id: string;
  type: string;
  value: number;
  threshold: number;
  unit: string;
  isCritical: boolean;
  isWarning?: boolean;
  timestamp?: Date;
}

export interface SensorPlacement {
  _id?: any;
  placementId: string;
  modelId: string;
  sensorId: string;
  position: { x: number; y: number; z: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseConfig {
  MONGO_URI: string;
  DB_NAME: string;
  COLLECTIONS: {
    SENSOR_READINGS: string;
    SENSOR_READINGS_LIVE: string;
    SENSOR_PLACEMENTS: string;
  };
}

export interface ServerConfig {
  PORT: number;
  CORS_ORIGIN: string;
  NODE_ENV: string;
}
