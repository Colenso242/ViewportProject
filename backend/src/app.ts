import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { serverConfig } from './config/server';

export class App {
  private app: Application;

  constructor() {
    this.app = express();
    this._setupMiddleware();
    this._setupRoutes();
  }

  private _setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(cors({
      origin: serverConfig.CORS_ORIGIN
    }));
  }

  private _setupRoutes(): void {
    this.app.get('/api/health', this._healthCheck.bind(this));

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
