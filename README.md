# 🎮 GEREZA - AI-Powered Prison Escape Game

An AI-powered multiplayer prison escape game built with React (Next.js), Colyseus, and Gemini AI.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Backend Architecture](#backend-architecture)
5. [State Management](#state-management)
6. [Database Integration](#database-integration)
7. [API Documentation](#api-documentation)
8. [Development Guide](#development-guide)

---

## 🚀 Quick Start

### Prerequisites

- **Bun** - Runtime for both frontend and backend
- **Node.js** - Alternative runtime (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd gereza

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies
cd ../frontend
bun install
```

### Running the Game

#### 1. Start the Backend Server

```bash
cd backend
bun run dev
```

You should see:
```
🚀 Starting Colyseus server...
✅ Database initialized at: /path/to/game_server.db
📡 REST API listening on http://localhost:3000
   Health check: http://localhost:3000/api/health

╔══════════════════════════════════════════════════╗
║  🎮 D&D Colyseus Server (Bun)                   ║
║                                                  ║
║  WebSocket:  ws://localhost:2567                 ║
║  REST API:   http://localhost:3000               ║
║  Database:   SQLite (game_server.db)             ║
╚══════════════════════════════════════════════════╝
```

#### 2. Start the Frontend

```bash
cd frontend
bun run dev
```

Frontend will be available at: **http://localhost:3001**

#### 3. Play the Game

1. Open browser to `http://localhost:3001`
2. Click **"CREATE ROOM"** to start as Dungeon Master (DM)
3. Share the room code with other players
4. Players join using **"JOIN EXISTING ROOM"**
5. DM approves players in the lobby
6. Click **"START GAME"** to begin!

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **WebSocket Client**: Colyseus.js
- **Runtime**: Bun

### Backend
- **Framework**: Colyseus (Multiplayer Game Server)
- **Language**: TypeScript
- **Database**: SQLite (via Bun's native API)
- **REST API**: Express.js
- **Runtime**: Bun
- **WebSocket**: @colyseus/ws-transport

### AI Integration
- **AI Provider**: Google Gemini API
- **Purpose**: AI-powered game master, dynamic storytelling

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Next.js   │  │ Colyseus.js  │  │   REST API   │      │
│  │    Pages    │──│   Client     │──│    Hooks     │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
│         │                │                   │              │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          │         WebSocket (2567)      HTTP (3000)
          │                │                   │
┌─────────┼────────────────┼───────────────────┼──────────────┐
│         │                ▼                   ▼              │
│  ┌──────▼───────┐  ┌──────────┐      ┌──────────┐         │
│  │   Express    │  │ Colyseus │      │  SQLite  │         │
│  │  REST API    │  │  Server  │◄────►│ Database │         │
│  └──────────────┘  └──────────┘      └──────────┘         │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │           │                            │
│              ┌─────▼───┐ ┌────▼────┐                       │
│              │  Lobby  │ │  Game   │                       │
│              │  Room   │ │  Room   │                       │
│              └─────────┘ └─────────┘                       │
│                        BACKEND                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Backend Architecture

### Directory Structure

```
backend/
├── game_server/
│   ├── index.ts                 # Server entry point
│   ├── rooms/                   # Game room definitions
│   │   ├── LobbyRoom.ts        # Pre-game lobby
│   │   └── GameRoom.ts         # Main game room
│   ├── schemas/                 # Colyseus state schemas
│   │   ├── LobbyState.ts       # Lobby state definition
│   │   └── GameState.ts        # Game state definition
│   ├── database/                # SQLite database layer
│   │   ├── db.ts               # Database initialization
│   │   ├── schema.sql          # Database schema
│   │   └── services.ts         # Database service layer
│   ├── api/                     # REST API endpoints
│   │   └── routes.ts           # API route handlers
│   ├── COLYSEUS_DOCS.md        # Colyseus reference
│   └── DATABASE_INTEGRATION.md  # Database guide
├── package.json
└── tsconfig.json
```

### Core Components

#### 1. Colyseus Server (`index.ts`)

The main server initializes:
- **WebSocket Server** (port 2567) - Real-time game communication
- **REST API Server** (port 3000) - HTTP queries and data access
- **SQLite Database** - Persistent storage
- **Room Definitions** - Lobby and Game rooms

```typescript
// Server initialization
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer })
});

gameServer.define('lobby', LobbyRoom);
gameServer.define('game', GameRoom);
```

#### 2. Room System

**LobbyRoom** - Pre-game lobby where:
- DM creates the room with a 4-character code
- Players join and wait for approval
- DM approves/rejects players
- DM starts the game when ready

**GameRoom** - Main game session where:
- Players interact with the game world
- AI (Gemini) acts as game master
- State updates in real-time
- Players can reconnect if disconnected

#### 3. Database Layer

**SQLite Database** with four main tables:
- `players` - Persistent player profiles
- `game_sessions` - Game room records
- `player_sessions` - Player participation in games
- `game_events` - Audit log of game actions

**Service Layer** provides type-safe database operations:
- `PlayerService` - Manage players
- `GameSessionService` - Manage game sessions
- `PlayerSessionService` - Track player participation
- `GameEventService` - Log events

---

## 🔄 State Management

### Colyseus Schema-Based State

Gereza uses **Colyseus Schema** for automatic state synchronization between server and clients.

#### Key Principles

1. **Server Authority**: Only the server can modify state
2. **Client Reactivity**: Clients listen to state changes and update UI
3. **Automatic Sync**: Colyseus handles all synchronization automatically
4. **Optimized**: Only changed properties are sent over the network

### State Definitions

#### Lobby State (`LobbyState.ts`)

```typescript
class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") userId: string;
  @type("string") username: string;
  @type("string") characterName: string;
  @type("string") status: string;        // "pending", "approved", "rejected"
  @type("boolean") approved: boolean;
  @type("number") joinedAt: number;
}

class LobbyState extends Schema {
  @type("string") roomCode: string;      // 4-character invite code
  @type("string") dmId: string;          // Session ID of DM
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") maxPlayers: number;
  @type("boolean") gameStarted: boolean;
}
```

#### Game State (`GameState.ts`)

```typescript
class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") userId: string;
  @type("string") username: string;
  @type("number") health: number;
}

class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") currentTurn: string;
  @type("number") round: number;
  @type("string") status: string;        // "waiting", "playing", "finished"
}
```

### State Synchronization Flow

```
┌──────────────┐
│   Client     │
│   (React)    │
└──────┬───────┘
       │
       │ Send message: "move", { x: 10, y: 20 }
       │
       ▼
┌──────────────────────────────────────────┐
│          Colyseus Server                 │
│                                          │
│  onMessage("move", (client, data) => {  │
│    const player = state.players.get(    │
│      client.sessionId                   │
│    );                                    │
│    player.x = data.x;  // Modify state  │
│    player.y = data.y;                   │
│  });                                     │
│                                          │
│  State change detected ─┐                │
└─────────────────────────┼────────────────┘
                          │
                          │ Auto-sync changed properties
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
┌──────────┐       ┌──────────┐       ┌──────────┐
│ Client 1 │       │ Client 2 │       │ Client 3 │
│          │       │          │       │          │
│ onChange │       │ onChange │       │ onChange │
│ callback │       │ callback │       │ callback │
│  fires   │       │  fires   │       │  fires   │
└──────────┘       └──────────┘       └──────────┘
```

### Client-Side State Listening

```typescript
// Frontend: Listen to state changes
room.state.onChange(() => {
  // Re-render UI with new state
  updateUI(room.state);
});

// Listen to specific player changes
room.state.players.onAdd((player, sessionId) => {
  console.log("Player joined:", player.username);

  // Listen to individual player property changes
  player.listen("health", (currentValue, previousValue) => {
    console.log(`Health: ${previousValue} → ${currentValue}`);
  });
});

room.state.players.onRemove((player, sessionId) => {
  console.log("Player left:", player.username);
});
```

### Server-Side State Mutation

```typescript
// Server: Update state
class GameRoom extends Room<GameState> {
  onCreate() {
    this.state = new GameState();

    // Game loop - runs every frame
    this.setSimulationInterval(() => {
      // Update game logic here
      this.state.round++;
    }, 1000/60); // 60 FPS
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.username = options.username;
    player.health = 100;

    // Add to state - automatically syncs to all clients
    this.state.players.set(client.sessionId, player);
  }

  setupMessageHandlers() {
    this.onMessage("attack", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      const target = this.state.players.get(data.targetId);

      if (player && target) {
        // Modify state - auto-syncs
        target.health -= data.damage;

        // Log to database
        GameEventService.log(this.dbGameSessionId!, 'player_action', {
          type: 'attack',
          attacker: player.username,
          target: target.username,
          damage: data.damage
        });
      }
    });
  }
}
```

### State Management Best Practices

1. **Keep State Minimal**: Only sync what clients need to render
2. **Use Appropriate Types**: Choose efficient types (`int8`, `uint16` vs `number`)
3. **Batch Updates**: Make multiple changes before next sync
4. **Clean Up Listeners**: Remove listeners when components unmount
5. **Never Mutate State from Client**: Always send messages to server

---

## 💾 Database Integration

### SQLite Schema

The game uses SQLite for persistent storage with automatic cleanup:

```sql
players              -- User profiles (persist across games)
game_sessions        -- Room records (purged when empty)
player_sessions      -- Player participation (purged when game ends)
game_events          -- Event logs (purged when game ends)
```

### Database Lifecycle

```
┌────────────────────────────────────────────────────┐
│                  Room Lifecycle                    │
├────────────────────────────────────────────────────┤
│                                                    │
│  onCreate()                                        │
│    └─► Create game_session record                 │
│                                                    │
│  onJoin(client)                                    │
│    ├─► Create/update player record                │
│    └─► Create player_session record               │
│                                                    │
│  onMessage("action")                               │
│    └─► Log game_event                             │
│                                                    │
│  onLeave(client)                                   │
│    ├─► Update player_session status               │
│    └─► Set reconnection token (if unexpected)     │
│                                                    │
│  onDispose()                                       │
│    ├─► Log final event                            │
│    ├─► DELETE all game_events for session         │
│    ├─► DELETE all player_sessions                 │
│    ├─► DELETE game_session                        │
│    └─► DELETE orphaned players                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Reconnection System

Players can reconnect to games after disconnection:

1. **Player Disconnects** (unexpected):
   - Server generates reconnection token
   - Stores in `player_sessions.reconnection_token`
   - Calls `allowReconnection(client, "manual")` - indefinite
   - Keeps player in room state (not deleted)

2. **Player Reconnects**:
   - Client provides token in join options
   - Server validates token
   - Restores player state (health, position, etc.)
   - Updates sessionId

3. **Automatic Cleanup**:
   - When room disposes (everyone left), all data purged
   - Database stays clean, no orphaned records

---

## 📡 API Documentation

### REST API Endpoints

Base URL: `http://localhost:3000/api`

#### Health Check
```
GET /health
```

#### Players
```
GET /players                    # Get all players
GET /players/:userId           # Get player by userId
GET /players/:userId/history   # Get player's game history
```

#### Games
```
GET /games                     # Get all active games
GET /games/:roomId            # Get game details
GET /games/code/:roomCode     # Find game by room code
GET /games/:roomId/players    # Get players in game
GET /games/:roomId/events     # Get game event log
```

#### Sessions
```
GET /sessions/:sessionId      # Get player session details
```

### Example API Usage

```typescript
// Fetch active lobbies
const response = await fetch('http://localhost:3000/api/games');
const { success, data } = await response.json();

const lobbies = data.filter(g =>
  g.room_type === 'lobby' && g.status === 'active'
);

// Get game event log
const events = await fetch(`http://localhost:3000/api/games/${roomId}/events`);
const { data: eventLog } = await events.json();
```

---

## 🔧 Development Guide

### Environment Variables

Create `.env.local` in backend:

```env
PORT=2567              # WebSocket port
API_PORT=3000          # REST API port
DB_PATH=./game_server.db  # SQLite database path (optional)
```

### Troubleshooting

#### Port Already in Use

If you get `EADDRINUSE` error:

```bash
# Kill processes on port 2567 and 3000
lsof -ti:2567 -ti:3000 | xargs kill -9

# Or use the clean script
bun run dev:clean
```

#### Database Issues

```bash
# Reset database (deletes all data!)
rm backend/game_server/database/game_server.db

# Restart server to recreate schema
cd backend && bun run dev
```

#### Frontend Can't Connect

1. Ensure backend is running first
2. Check backend console for errors
3. Verify ports: WebSocket (2567), REST API (3000)
4. Check browser console for connection errors

### Development Commands

```bash
# Backend
cd backend
bun run dev          # Start with auto-reload
bun run start        # Production start
bun run build        # Build for production

# Frontend
cd frontend
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production build
```

### Code Structure Best Practices

1. **Room Logic**: Keep in `rooms/` directory
2. **State Schemas**: Define in `schemas/` directory
3. **Database Operations**: Use service layer in `database/services.ts`
4. **API Routes**: Add to `api/routes.ts`
5. **Type Safety**: Always use TypeScript interfaces

---

## 📚 Additional Documentation

- [Colyseus Documentation](backend/game_server/COLYSEUS_DOCS.md) - Complete Colyseus reference
- [Database Integration Guide](backend/game_server/DATABASE_INTEGRATION.md) - Database setup and usage
- [Official Colyseus Docs](https://docs.colyseus.io) - Framework documentation

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

## 📄 License

[Add your license here]

---

## 🎮 Game Flow Summary

```
1. Player opens game → Home page
                      ↓
2. Create or Join? → Create: DM creates room with code
                   → Join: Enter room code
                      ↓
3. Enter name/character → Join lobby
                      ↓
4. Lobby:
   - DM: Approve/reject players, start game
   - Players: Wait for approval
                      ↓
5. Game starts → All players move to game room
                      ↓
6. Play game → AI acts as game master
             → Real-time state sync
             → Players can reconnect
                      ↓
7. Game ends → All leave
             → Database auto-purges session data
```

---

**Built with ❤️ using Bun, Colyseus, React, and Gemini AI**
