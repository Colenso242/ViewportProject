import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { serverConfig } from './config/server';
import {SensorService} from "./services/SensorService";
import {PlacementService} from "./services/PlacementService";

export class App {
  private app: Application;

  constructor() {
    this.app = express();
    this._setupMiddleware();
  }

  setServices(sensorService: SensorService, placementService: PlacementService) {
    this._setupRoutes(sensorService, placementService);
  }

  private _setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(cors({
      origin: serverConfig.CORS_ORIGIN
    }));
  }

  private _setupRoutes(sensorService: SensorService, placementService?: PlacementService): void {
    this.app.get('/api/health', this._healthCheck.bind(this));

    if (sensorService) {
      this.app.get('/api/sensors/:id/history', async (req: Request, res: Response) => {
        try {
          const sensorId = String(req.params.id);
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

    if (placementService) {
      this._setupPlacementRoutes(placementService);
    }

    if (serverConfig.NODE_ENV === 'production') {
      this._setupProductionRoutes();
    }
  }

  private _setupPlacementRoutes(placementService: PlacementService): void {
    this.app.get('/api/placements/:modelId', async (req: Request, res: Response) => {
      try {
        const placements = await placementService.getByModel(String(req.params.modelId));
        res.json(placements);
      } catch (error) {
        console.error(`Error fetching placements for ${req.params.modelId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    this.app.post('/api/placements', async (req: Request, res: Response) => {
      try {
        const { placementId, modelId, sensorId, position } = req.body || {};
        const validPosition = position
          && typeof position.x === 'number'
          && typeof position.y === 'number'
          && typeof position.z === 'number';
        if (typeof placementId !== 'string' || !placementId
          || typeof modelId !== 'string' || !modelId
          || typeof sensorId !== 'string'
          || !validPosition) {
          res.status(400).json({ error: 'placementId, modelId, sensorId and numeric position {x,y,z} are required' });
          return;
        }

        const created = await placementService.create({
          placementId,
          modelId,
          sensorId,
          position: { x: position.x, y: position.y, z: position.z }
        });
        res.status(201).json(created);
      } catch (error) {
        console.error('Error creating placement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    this.app.patch('/api/placements/:placementId', async (req: Request, res: Response) => {
      try {
        const { sensorId } = req.body || {};
        if (typeof sensorId !== 'string') {
          res.status(400).json({ error: 'sensorId is required' });
          return;
        }

        const updated = await placementService.updateSensor(String(req.params.placementId), sensorId);
        if (!updated) {
          res.status(404).json({ error: 'Placement not found' });
          return;
        }
        res.json({ ok: true });
      } catch (error) {
        console.error(`Error updating placement ${req.params.placementId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    this.app.delete('/api/placements/:placementId', async (req: Request, res: Response) => {
      try {
        const removed = await placementService.remove(String(req.params.placementId));
        if (!removed) {
          res.status(404).json({ error: 'Placement not found' });
          return;
        }
        res.json({ ok: true });
      } catch (error) {
        console.error(`Error deleting placement ${req.params.placementId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  }

  private _healthCheck(_req: Request, res: Response): void {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  }

  private _setupProductionRoutes(): void {
    const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    // Cross-origin isolation unlocks SharedArrayBuffer for the multithreaded
    // IFC wasm build (mirrors the vite dev server headers).
    this.app.use((_req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });
    this.app.use(express.static(distPath));
    this.app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  getExpressApp(): Application {
    return this.app;
  }
}
