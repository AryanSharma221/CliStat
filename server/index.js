import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import weatherRoutes from './routes/weather.js';
import sessionRoutes from './routes/sessions.js';
import { startIoTSimulator } from './services/iotSimulator.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[IoT] Client connected: ${socket.id}`);

  const cleanup = startIoTSimulator(socket);

  socket.on('disconnect', () => {
    console.log(`[IoT] Client disconnected: ${socket.id}`);
    cleanup();
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🌡️  ThermoSync Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for IoT sensor streams`);
  console.log(`🌤️  Weather proxy: http://localhost:${PORT}/api/weather/current`);
  console.log(`💾 Sessions API:  http://localhost:${PORT}/api/sessions\n`);
});
