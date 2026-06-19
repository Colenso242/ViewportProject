import type { SensorData } from '@shared/types';

// Wire DTOs live in shared/types.d.ts. They're re-exported here under the names
// the frontend already uses, so existing imports from '../types' are unchanged.
export type { SensorData as SensorReading, SensorConfig } from '@shared/types';

/**
 * A sensor anchored to an arbitrary point on a model.
 * The position is stored in model-local coordinates so it stays valid
 * across reloads (world transforms are recomputed deterministically per file).
 *
 * Same wire shape as the backend's persisted placement (sans DB metadata).
 */
export type { SensorPlacement as SensorPoint } from '@shared/types';

/**
 * A sensor badge projected to 2D screen space, ready to render in the overlay.
 */
export interface MappedSensor {
  uuid: string;
  sensorId: string;
  x: number;
  y: number;
  visible: boolean;
  data?: SensorData;
}

