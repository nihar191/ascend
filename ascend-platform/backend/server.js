// backend/server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pool from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import problemRoutes from './routes/problem.routes.js';
import leagueRoutes from './routes/league.routes.js';
import matchRoutes from './routes/match.routes.js';
import matchmakingService from './services/matchmaking.service.js';
import { handleMatchmakingEvents } from './socket/matchmaking.socket.js';
import { handleMatchEvents } from './socket/match.socket.js';
import scoringRoutes from './routes/scoring.routes.js';
import scoringService from './services/scoring.service.js';
import rankingService from './services/ranking.service.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handler (will be implemented in next steps)
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
  });
});

// Start matchmaking service
matchmakingService.start();
handleMatchmakingEvents(io);
handleMatchEvents(io);

// Make io globally accessible for matchmaking service
global.io = io;

// Make services globally accessible
global.scoringService = scoringService;
global.rankingService = rankingService;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  matchmakingService.stop();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Routes will be added in next steps
app.get('/api', (req, res) => {
  res.json({ message: 'Ascend API Server' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Ascend Platform Backend Server      ║
╠════════════════════════════════════════╣
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Port: ${PORT}                            ║
║   Socket.IO: Active                    ║
╚════════════════════════════════════════╝
  `);
});

export { io };
