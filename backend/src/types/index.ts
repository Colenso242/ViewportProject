import type { SensorPlacement as SensorPlacementDTO } from '@shared/types';

// Wire DTOs are defined once in shared/types.d.ts and re-exported here so the
// rest of the backend keeps importing them from '../types' unchanged.
export type { SensorData, SensorConfig } from '@shared/types';

export interface SensorMetadata {
  sensorId: string;
  sensorType: string;
  unit: string;
  threshold: number;
}

// The persisted Mongo document for a sensor reading (backend-only shape; the
// API serializes this into the shared SensorData DTO before sending).
export interface SensorReading {
  _id?: any;
  timestamp: Date;
  metadata: SensorMetadata;
  value: number;
  isCritical: boolean;
  isWarning?: boolean;
}

// The persisted placement document: the shared placement DTO plus DB metadata.
export interface SensorPlacement extends SensorPlacementDTO {
  _id?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseConfig {
  MONGO_URI: string;
  DB_NAME: string;
  COLLECTIONS: {
    SENSOR_READINGS: string;
    SENSOR_PLACEMENTS: string;
  };
}

export interface ServerConfig {
  PORT: number;
  CORS_ORIGIN: string;
  NODE_ENV: string;
}
