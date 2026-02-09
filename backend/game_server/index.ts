// backend/src/index.ts
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import express from 'express';
import { LobbyRoom } from './rooms/LobbyRoom';
import { GameRoom } from './rooms/GameRoom';
import apiRoutes from './api/routes';

// 🔥 Initialize database (this will run schema.sql)
import './database/db';

const PORT = Number(process.env.PORT) || 2567;
const API_PORT = Number(process.env.API_PORT) || 3000;

console.log('🚀 Starting Colyseus server...');

// Create Express app for REST API
const app = express();
app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Mount API routes
app.use('/api', apiRoutes);

// Start REST API server
app.listen(API_PORT, () => {
  console.log(`📡 REST API listening on http://localhost:${API_PORT}`);
  console.log(`   Health check: http://localhost:${API_PORT}/api/health`);
});

// Create HTTP server for WebSocket
const httpServer = createServer();

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer
  })
});

// Register rooms
gameServer.define('lobby', LobbyRoom);
gameServer.define('game', GameRoom).filterBy(['roomCode']);  // 🔥 Group players by roomCode

// Start WebSocket server
gameServer.listen(PORT);

console.log(`
╔══════════════════════════════════════════════════╗
║  🎮 D&D Colyseus Server (Bun)                   ║
║                                                  ║
║  WebSocket:  ws://localhost:${PORT}                 ║
║  REST API:   http://localhost:${API_PORT}               ║
║  Database:   SQLite (game_server.db)             ║
╚══════════════════════════════════════════════════╝

Available API Endpoints:
  GET  /api/health
  GET  /api/players
  GET  /api/players/:userId
  GET  /api/players/:userId/history
  GET  /api/games
  GET  /api/games/:roomId
  GET  /api/games/code/:roomCode
  GET  /api/games/:roomId/players
  GET  /api/games/:roomId/events
  GET  /api/sessions/:sessionId
`);