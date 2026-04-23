class SensorSocketHandler {
  constructor(io, sensorService) {
    this.io = io;
    this.sensorService = sensorService;
  }

  initialize() {
    this.io.on('connection', (socket) => this._handleConnection(socket));
  }

  async _handleConnection(socket) {
    console.log('Client connected to WebSocket:', socket.id);

    try {
      const initialData = await this.sensorService.getLatestReadings();
      socket.emit('sensors-info', initialData);
    } catch (error) {
      console.error("Failed to send initial sensor info to client:", error);
    }

    socket.on('disconnect', () => this._handleDisconnect(socket.id));
  }

  _handleDisconnect(socketId) {
    console.log('Client disconnected:', socketId);
  }
}

module.exports = SensorSocketHandler;
