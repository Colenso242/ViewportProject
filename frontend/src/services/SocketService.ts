import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private host: string;

  constructor() {
    this.host = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
  }

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.host);
    }
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();

