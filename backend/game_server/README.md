# Gereza Game Server

This directory contains the Colyseus game server for Gereza. It manages the real-time multiplayer implementation for both the Lobby and the main Game.

## 🚀 Running the Server

To start the server locally:

```bash
# From the backend directory
bun run game_server/index.ts

# Or with npm/node (if configured)
# npm start
```

The server will start on **port 2567** (or the PORT env var).

ws://localhost:2567

## 🏰 Architecture

The server is built using [Colyseus](https://colyseus.io/) and is structured into **Rooms** and **Schemas** (State).

### 🧩 Rooms

Rooms are the main units of the server. Each room has a unique ID and its own state.

1.  **LobbyRoom** (`lobby`):
    - **Purpose**: Handles player gathering, character selection, and DM approval.
    - **Logic**:
        - `onCreate`: Initializes state and sets up message handlers (`approve-player`, `kick-player`, `start-game`).
        - `onJoin`: Handles player connection. DMs receive a special "joined-as-dm" message. Players are set to "pending" status.
        - `onLeave`: If the DM leaves, the room closes. If a player leaves, they are removed from state.
    - **Limits**: `maxClients = 7` (1 DM + 6 Players).

2.  **GameRoom** (`game`):
    - **Purpose**: The main gameplay session.
    - **Logic**: Handles real-time movement, synchronized state, and gameplay actions.
    - **Limits**: `maxClients = 4` (default in `GameRoom.ts`).

### 📦 State (Schemas)

State synchronization is handled automatically by Colyseus using high-performance binary schemas.

-   **LobbyState**:
    - `roomCode`: The unique code for the lobby.
    - `dmId`: The Session ID of the Dungeon Master.
    - `players`: A `MapSchema` of connected `Player` objects.
    - `gameStarted`: Boolean flag for transition.

-   **GameState**:
    - `players`: Tracks active players, including `x`, `y` coordinates for the grid.

## 📈 Scalability & Limits

### 1. Room Limits (Horizontal)
This server is designed to handle **thousands of concurrent rooms** depending on the hardware (CPU/RAM).
- Colyseus spawns rooms as lightweight processes.
- A single Node.js/Bun process can typically handle **1,500+ CCU (Concurrent Users)** or **200+ active rooms** easily on a standard VPS.

### 2. Player Limits (Per Room)
- **Lobby**: Hardcoded to **7 clients** (1 DM + 6 Players).
- **Game**: currently set to 4, but can be increased.
- The practical limit per room for a real-time game like this (with 60Hz patch rate) is usually **50-60 players** before network bandwidth becomes a bottleneck, but for a turn-based or D&D style game, you could theoretically handle more.

### 3. Scaling Up
To scale beyond a single server instance, Colyseus supports **Presence** (Redis) and **Driver** (MongoDB/Redis) to distribute rooms across multiple server nodes.

## 📡 Client Connection Guide

**Lobby Connection:**
```typescript
const client = new Client("ws://localhost:2567");
const lobby = await client.joinOrCreate("lobby", {
    roomCode: "GAME1",
    dmId: "dm-user-123",
    username: "PlayerOne",
    userId: "user-001"
});
```
