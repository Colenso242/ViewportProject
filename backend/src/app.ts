import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { serverConfig } from './config/server';
import { SensorService } from './services/SensorService';

const SENSOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_HISTORY_LIMIT = 5000;
const DEFAULT_HISTORY_LIMIT = 1000;
const MAX_TIME_RANGE_MINUTES = 60 * 24 * 7; // 1 week

function parsePositiveInt(raw: unknown, fallback: number, max: number): number {
  if (typeof raw !== 'string') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export class App {
  private app: Application;

  constructor() {
    this.app = express();
    this._setupMiddleware();
    this.app.get('/api/health', this._healthCheck.bind(this));
  }

  registerSensorRoutes(sensorService: SensorService): void {
    this.app.get('/api/sensors/:id/history', async (req: Request, res: Response) => {
      const sensorId = req.params.id;
      if (!SENSOR_ID_PATTERN.test(sensorId)) {
        res.status(400).json({ error: 'Invalid sensor id' });
        return;
      }

      const limit = parsePositiveInt(req.query.limit, DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
      const timeRangeMinutes = req.query.timeRangeMinutes
        ? parsePositiveInt(req.query.timeRangeMinutes, 0, MAX_TIME_RANGE_MINUTES) || undefined
        : undefined;

      try {
        const history = await sensorService.getHistoricalData(sensorId, limit, timeRangeMinutes);
        res.json(history);
      } catch (error) {
        console.error(`Error fetching history for ${sensorId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    if (serverConfig.NODE_ENV === 'production') {
      this._setupProductionRoutes();
    }
  }

  private _setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(cors({
      origin: serverConfig.CORS_ORIGIN
    }));
  }

  private _healthCheck(_req: Request, res: Response): void {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  }

  private _setupProductionRoutes(): void {
    const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    this.app.use(express.static(distPath));
    this.app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  getExpressApp(): Application {
    return this.app;
  }
}
