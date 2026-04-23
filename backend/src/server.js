require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const Application = require('./app');
const DatabaseService = require('./services/DatabaseService');
const SensorService = require('./services/SensorService');
const ChangeStreamService = require('./services/ChangeStreamService');
const SensorSocketHandler = require('./sockets/SensorSocketHandler');
const serverConfig = require('./config/server');

class ServerBootstrap {
  constructor() {
    this.application = new Application();
    this.server = http.createServer(this.application.getExpressApp());
    this.io = this._createSocketIO();
    this.services = {};
  }

  _createSocketIO() {
    return new Server(this.server, {
      cors: {
        origin: serverConfig.CORS_ORIGIN,
        methods: ['GET', 'POST']
      }
    });
  }

  async _initializeServices() {
    // Connect to database
    await DatabaseService.connect();

    // Initialize services
    const liveCollection = DatabaseService.getCollection('sensorReadingsLive');
    this.services.sensorService = new SensorService(liveCollection);
    this.services.changeStreamService = new ChangeStreamService(
      liveCollection,
      this.services.sensorService,
      this.io
    );

    // Setup socket handlers
    const socketHandler = new SensorSocketHandler(this.io, this.services.sensorService);
    socketHandler.initialize();

    // Start watching for sensor updates
    this.services.changeStreamService.start();
  }

  async start() {
    try {
      await this._initializeServices();

      this.server.listen(serverConfig.PORT, () => {
        console.log(`Server listening at http://localhost:${serverConfig.PORT}`);
      });

      this._setupGracefulShutdown();
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  _setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');

      if (this.services.changeStreamService) {
        await this.services.changeStreamService.stop();
      }

      await DatabaseService.disconnect();

      this.server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// Bootstrap and start the server
const bootstrap = new ServerBootstrap();
bootstrap.start();
