import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { App } from './app';
import DatabaseService from './services/DatabaseService';
import { SensorService } from './services/SensorService';
import { ChangeStreamService } from './services/ChangeStreamService';
import { SensorSocketHandler } from './sockets/SensorSocketHandler';
import { serverConfig } from './config/server';

class ServerBootstrap {
  private application: App;
  private server: http.Server;
  private io: SocketIOServer;
  private services: {
    sensorService?: SensorService;
    changeStreamService?: ChangeStreamService;
  } = {};

  constructor() {
    this.application = new App();
    this.server = http.createServer(this.application.getExpressApp());
    this.io = this._createSocketIO();
  }

  private _createSocketIO(): SocketIOServer {
    return new SocketIOServer(this.server, {
      cors: {
        origin: serverConfig.CORS_ORIGIN,
        methods: ['GET', 'POST']
      }
    });
  }

  private async _initializeServices(): Promise<void> {
    await DatabaseService.connect();

    const liveCollection = DatabaseService.getCollection('sensorReadingsLive');
    this.services.sensorService = new SensorService(liveCollection);
    this.services.changeStreamService = new ChangeStreamService(
      liveCollection,
      this.services.sensorService,
      this.io
    );

    const socketHandler = new SensorSocketHandler(this.io, this.services.sensorService);
    socketHandler.initialize();

    await this.services.changeStreamService.start();
  }

  async start(): Promise<void> {
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

  private _setupGracefulShutdown(): void {
    const shutdown = async (): Promise<void> => {
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

const bootstrap = new ServerBootstrap();
bootstrap.start();
