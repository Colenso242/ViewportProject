import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { serverConfig } from './config/server';
import {SensorService, MAX_HISTORY_LIMIT} from "./services/SensorService";
import {PlacementService} from "./services/PlacementService";

// Reject oversized request bodies before parsing (large-payload DoS guard).
const JSON_BODY_LIMIT = '64kb';
// Upper bound on identifier-style string fields/params, so unbounded strings
// can't be stored or used to build pathological queries.
const MAX_ID_LENGTH = 200;
// Fixed-window rate limit applied to the /api surface.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 300;

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
    // Note: the API is intentionally unauthenticated — this is an internal
    // tool. Revisit (API key / session auth) before exposing it publicly.
    this.app.disable('x-powered-by');
    this.app.use(this._securityHeaders);
    this.app.use(express.json({ limit: JSON_BODY_LIMIT }));
    this.app.use(cors({
      origin: serverConfig.CORS_ORIGIN
    }));
    this.app.use('/api', this._rateLimiter({
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX_REQUESTS
    }));
  }

  /** Minimal hardening headers (helmet-style) without a dependency. */
  private _securityHeaders(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  }

  /**
   * Lightweight in-memory fixed-window rate limiter keyed by client IP. No
   * external store — adequate for a single-process internal tool. The map is
   * cleared wholesale once it grows large to bound memory under IP churn.
   */
  private _rateLimiter(options: { windowMs: number; max: number }) {
    const hits = new Map<string, { count: number; resetAt: number }>();
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      if (hits.size > 10_000) hits.clear();

      const key = req.ip ?? 'unknown';
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + options.windowMs };
        hits.set(key, entry);
      }

      entry.count++;
      if (entry.count > options.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({ error: 'Too many requests' });
        return;
      }
      next();
    };
  }

  /** True when `value` is a non-empty (unless `allowEmpty`) string within the length cap. */
  private _isValidId(value: unknown, allowEmpty = false): value is string {
    return typeof value === 'string'
      && (allowEmpty || value.length > 0)
      && value.length <= MAX_ID_LENGTH;
  }

  /**
   * Parse an optional positive-integer query param. Returns `undefined` when
   * absent, the clamped value when valid, or an `Error` describing why the
   * value was rejected (non-numeric / non-positive).
   */
  private _parsePositiveInt(
    raw: unknown,
    name: string,
    max?: number
  ): number | undefined | Error {
    if (raw === undefined) return undefined;

    const value = Number(raw);
    if (!Number.isFinite(value) || value < 1) {
      return new Error(`Invalid '${name}': must be a positive integer`);
    }

    const truncated = Math.trunc(value);
    return max ? Math.min(truncated, max) : truncated;
  }

  private _setupRoutes(sensorService: SensorService, placementService?: PlacementService): void {
    this.app.get('/api/health', this._healthCheck.bind(this));

    if (sensorService) {
      this.app.get('/api/sensors/:id/history', async (req: Request, res: Response) => {
        try {
          const sensorId = String(req.params.id);

          const limit = this._parsePositiveInt(req.query.limit, 'limit', MAX_HISTORY_LIMIT);
          const timeRangeMinutes = this._parsePositiveInt(req.query.timeRangeMinutes, 'timeRangeMinutes');

          if (limit instanceof Error) {
            res.status(400).json({ error: limit.message });
            return;
          }
          if (timeRangeMinutes instanceof Error) {
            res.status(400).json({ error: timeRangeMinutes.message });
            return;
          }

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
        const modelId = String(req.params.modelId);
        if (!this._isValidId(modelId)) {
          res.status(400).json({ error: `Invalid modelId (1-${MAX_ID_LENGTH} chars)` });
          return;
        }

        const placements = await placementService.getByModel(modelId);
        res.json(placements);
      } catch (error) {
        console.error(`Error fetching placements for ${req.params.modelId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    this.app.post('/api/placements', async (req: Request, res: Response) => {
      try {
        const { placementId, modelId, sensorId, position } = req.body || {};
        const validPosition = !!position
          && Number.isFinite(position.x)
          && Number.isFinite(position.y)
          && Number.isFinite(position.z);
        // sensorId may be empty (an unlinked point); placementId/modelId may not.
        if (!this._isValidId(placementId)
          || !this._isValidId(modelId)
          || !this._isValidId(sensorId, true)
          || !validPosition) {
          res.status(400).json({ error: `placementId and modelId (1-${MAX_ID_LENGTH} chars), sensorId (string up to ${MAX_ID_LENGTH} chars) and finite numeric position {x,y,z} are required` });
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
        const placementId = String(req.params.placementId);
        if (!this._isValidId(placementId)) {
          res.status(400).json({ error: `Invalid placementId (1-${MAX_ID_LENGTH} chars)` });
          return;
        }

        const { sensorId } = req.body || {};
        if (!this._isValidId(sensorId, true)) {
          res.status(400).json({ error: `sensorId must be a string up to ${MAX_ID_LENGTH} chars` });
          return;
        }

        const updated = await placementService.updateSensor(placementId, sensorId);
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
        const placementId = String(req.params.placementId);
        if (!this._isValidId(placementId)) {
          res.status(400).json({ error: `Invalid placementId (1-${MAX_ID_LENGTH} chars)` });
          return;
        }

        const removed = await placementService.remove(placementId);
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
