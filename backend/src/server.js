const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');

app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Simulate IoT Data
const sensors = [
  { id: 'temp-1', type: 'temperature', min: 20, max: 100, threshold: 50, unit: '°C' },
  { id: 'rpm-1', type: 'rpm', min: 0, max: 5000, threshold: 4500, unit: 'RPM' },
  { id: 'vib-1', type: 'vibration', min: 0, max: 10, threshold: 8, unit: 'mm/s' }
];

setInterval(() => {
  const data = sensors.map(sensor => {
    // Generate a random value with high variance occasionally to simulate spikes
    const variance = (sensor.max - sensor.min) * 0.1;
    const isSpike = Math.random() > 0.9;
    let val = sensor.min + Math.random() * (sensor.max - sensor.min) * (isSpike ? 1 : 0.8);

    return {
      id: sensor.id,
      type: sensor.type,
      value: parseFloat(val.toFixed(2)),
      threshold: sensor.threshold,
      unit: sensor.unit,
      isCritical: val >= sensor.threshold
    };
  });

  io.emit('sensor-update', data);
}, 2000);

io.on('connection', (socket) => {
  console.log('Client connected to WebSocket:', socket.id);
  socket.emit('sensors-info', sensors); // Send initial info on connect
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
