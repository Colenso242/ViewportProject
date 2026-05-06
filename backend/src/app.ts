import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { serverConfig } from './config/server';
import {SensorService} from "./services/SensorService";

export class App {
  private app: Application;

  constructor() {
    this.app = express();
    this._setupMiddleware();
  }

  setSensorService(sensorService:SensorService) {
    this._setupRoutes(sensorService);
  }

  private _setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(cors({
      origin: serverConfig.CORS_ORIGIN
    }));
  }

  private _setupRoutes(sensorService: SensorService): void {
    this.app.get('/api/health', this._healthCheck.bind(this));

    if (sensorService) {
      this.app.get('/api/sensors/:id/history', async (req: Request, res: Response) => {
        try {
          const sensorId = req.params.id;
          const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
          const timeRangeMinutes = req.query.timeRangeMinutes ? parseInt(req.query.timeRangeMinutes as string) : undefined;

          const history = await sensorService.getHistoricalData(sensorId, limit, timeRangeMinutes);
          res.json(history);
        } catch (error) {
          console.error(`Error fetching history for ${req.params.id}:`, error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
    }

    if (serverConfig.NODE_ENV === 'production') {
      this._setupProductionRoutes();
    }
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
