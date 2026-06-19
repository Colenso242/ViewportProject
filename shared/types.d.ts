/**
 * Wire DTOs shared by the backend (API + socket layer) and the frontend client.
 *
 * This is a `.d.ts` of pure types consumed via `import type` on both sides, so:
 *  - nothing is emitted and there's no runtime dependency between the packages
 *    (TS path aliases aren't rewritten in compiled JS — type-only imports are
 *    simply erased, so `tsx` / `node dist` / Vite never resolve this module);
 *  - the backend's `rootDir: src` build is unaffected, since declaration files
 *    are never emitted and don't trip the "file is not under rootDir" check.
 *
 * Edit the wire contract here once; both sides re-export these under their own
 * local names (frontend `SensorReading`/`SensorPoint`, backend `SensorData`/the
 * `SensorPlacement` DB document which extends the placement DTO).
 */

/** A single sensor reading as serialized over REST / the `sensor-update` socket. */
export interface SensorData {
  id: string;
  type: string;
  value: number;
  threshold: number;
  unit: string;
  isCritical: boolean;
  isWarning?: boolean;
  /** `Date` on the server; an ISO string once JSON-serialized to the client. */
  timestamp: string | Date;
}

/** Static sensor configuration broadcast on the `sensors-info` channel. */
export interface SensorConfig {
  id: string;
  name: string;
  type?: string;
  unit: string;
  min: number;
  max: number;
  threshold: number;
}

/** A sensor anchored to a point on a model, in model-local coordinates. */
export interface SensorPlacement {
  placementId: string;
  modelId: string;
  sensorId: string;
  position: { x: number; y: number; z: number };
}
