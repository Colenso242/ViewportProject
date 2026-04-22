require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');


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

//db
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'iot_digital_twin';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'sensor_readings';

let db;
let sensorCollection;

const targetSensors = ['temp-1', 'rpm-1', 'vib-1'];

//middleware
app.use(express.json());
app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
    })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: !!db });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function connectToMongo() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log(`Connected to MongoDB at ${MONGO_URI}`);

    db = client.db(DB_NAME);
    sensorCollection = db.collection(COLLECTION_NAME);

    startPolling();
  } catch (error) {
    console.error("Connection Failed, check if MongoDB is running:", error);
    process.exit(1);
  }
}

function startPolling() {
  console.log(`Starting data polling every 1s on ${DB_NAME}.${COLLECTION_NAME}...`);

  setInterval(async () => {
    try {
      const latestReadings = await Promise.all(
        targetSensors.map(id =>
          sensorCollection
            .find({ "metadata.sensorId": id })
            .sort({ timestamp: -1 })
            .limit(1)
            .next()
        )
      );

      const payload = latestReadings
        .filter(doc => doc !== null)
        .map(doc => ({
          id: doc.metadata.sensorId,
          type: doc.metadata.sensorType,
          value: doc.value,
          threshold: doc.metadata.threshold,
          unit: doc.metadata.unit,
          isCritical: doc.isCritical,
          timestamp: doc.timestamp
        }));

      if (payload.length > 0) {
        io.emit('sensor-update', payload);
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 1000);
}

//socket.io
io.on('connection', async (socket) => {
  console.log('Client connected to WebSocket:', socket.id);

  // Quando un client si collega, mandiamogli l'ultimo stato noto dei sensori
  if (sensorCollection) {
    try {
      const latestReadings = await Promise.all(
        targetSensors.map(id =>
          sensorCollection
            .find({ "metadata.sensorId": id })
            .sort({ timestamp: -1 })
            .limit(1)
            .next()
        )
      );

      const initialData = latestReadings
        .filter(doc => doc !== null)
        .map(doc => ({
          id: doc.metadata.sensorId,
          type: doc.metadata.sensorType,
          value: doc.value,
          threshold: doc.metadata.threshold,
          unit: doc.metadata.unit,
          isCritical: doc.isCritical,
          timestamp: doc.timestamp
        }));

      socket.emit('sensors-info', initialData);
    } catch (err) {
      console.error("Failed to fetch initial sensor info", err);
    }
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});


connectToMongo().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
});