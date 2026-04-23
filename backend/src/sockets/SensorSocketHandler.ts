import { Server as SocketIOServer, Socket } from 'socket.io';
import { SensorService } from '../services/SensorService';

export class SensorSocketHandler {
  constructor(
    private io: SocketIOServer,
    private sensorService: SensorService
  ) {}

  initialize(): void {
    this.io.on('connection', (socket: Socket) => this._handleConnection(socket));
  }

  private async _handleConnection(socket: Socket): Promise<void> {
    console.log('Client connected to WebSocket:', socket.id);

    try {
      const initialData = await this.sensorService.getLatestReadings();
      socket.emit('sensors-info', initialData);
    } catch (error) {
      console.error("Failed to send initial sensor info to client:", error);
    }

    socket.on('disconnect', () => this._handleDisconnect(socket.id));
  }

  private _handleDisconnect(socketId: string): void {
    console.log('Client disconnected:', socketId);
  }
}
