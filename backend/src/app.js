const express = require('express');
const cors = require('cors');
const path = require('path');
const serverConfig = require('./config/server');

class Application {
  constructor() {
    this.app = express();
    this._setupMiddleware();
    this._setupRoutes();
  }

  _setupMiddleware() {
    this.app.use(express.json());
    this.app.use(cors({
      origin: serverConfig.CORS_ORIGIN
    }));
  }

  _setupRoutes() {
    this.app.get('/api/health', this._healthCheck.bind(this));

    if (serverConfig.NODE_ENV === 'production') {
      this._setupProductionRoutes();
    }
  }

  _healthCheck(_req, res) {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  }

  _setupProductionRoutes() {
    const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    this.app.use(express.static(distPath));
    this.app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  getExpressApp() {
    return this.app;
  }
}

module.exports = Application;
