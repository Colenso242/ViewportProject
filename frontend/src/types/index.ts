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

