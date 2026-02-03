// backend/src/index.ts
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { LobbyRoom } from './rooms/LobbyRoom';
import { GameRoom } from './rooms/GameRoom';

const PORT = Number(process.env.PORT) || 2567;

console.log('🚀 Starting Colyseus server...');

// Create simple HTTP server
const httpServer = createServer();

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer
  })
});

// Register rooms
gameServer.define('lobby', LobbyRoom);
gameServer.define('game', GameRoom);

// Start server
gameServer.listen(PORT);

console.log(`
╔══════════════════════════════════════╗
║  🎮 D&D Colyseus Server (Bun)       ║
║                                      ║
║  Server:  ws://localhost:${PORT}        ║
╚══════════════════════════════════════╝
`);