export interface SensorReading {
  id: string;
  timestamp: string | Date;
  value: number;
  type?: string;
  unit?: string;
  threshold?: number;
  isWarning?: boolean;
  isCritical?: boolean;
}

export interface SensorConfig {
  id: string;
  name: string;
  type?: string;
  unit: string;
  min: number;
  max: number;
  threshold: number;
}

/**
 * A sensor anchored to an arbitrary point on a model.
 * The position is stored in model-local coordinates so it stays valid
 * across reloads (world transforms are recomputed deterministically per file).
 */
export interface SensorPoint {
  placementId: string;
  modelId: string;
  sensorId: string;
  position: { x: number; y: number; z: number };
}

