# Database Integration Guide

This document explains the SQLite database integration for persistent player and game session management in the Colyseus game server.

## Overview

The game server now uses **SQLite** to persist:
- Player information (userId, username, character names)
- Game sessions (lobby and game rooms)
- Player sessions (which players are in which games)
- Game events (audit log of important actions)

**Key Features:**
- ✅ Players can reconnect to games after disconnection
- ✅ Game state persists until the game ends
- ✅ Complete event logging for debugging and analytics
- ✅ REST API for querying game and player data

## Database Schema

### Tables

#### 1. `players`
Stores persistent player information.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | TEXT | Unique user identifier (from your auth system) |
| username | TEXT | Player's display name |
| character_name | TEXT | Character name (for D&D) |
| created_at | INTEGER | Timestamp (milliseconds) |
| updated_at | INTEGER | Timestamp (milliseconds) |

#### 2. `game_sessions`
Tracks all game rooms (lobby and game).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| room_id | TEXT | Colyseus roomId |
| room_type | TEXT | 'lobby' or 'game' |
| room_code | TEXT | 4-character invite code (for lobbies) |
| dm_id | TEXT | SessionId of the DM |
| status | TEXT | 'active', 'completed', or 'abandoned' |
| max_players | INTEGER | Maximum allowed players |
| created_at | INTEGER | When room was created |
| started_at | INTEGER | When game started (null for lobbies) |
| ended_at | INTEGER | When game ended |
| metadata | TEXT | JSON string for additional data |

#### 3. `player_sessions`
Tracks players in specific game sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| game_session_id | INTEGER | Foreign key to game_sessions |
| player_id | INTEGER | Foreign key to players |
| session_id | TEXT | Colyseus sessionId |
| status | TEXT | 'connected', 'disconnected', 'left', 'kicked' |
| approved | BOOLEAN | Whether player is approved (for lobbies) |
| health | INTEGER | Player's health (for game rooms) |
| joined_at | INTEGER | When player joined |
| left_at | INTEGER | When player left |
| last_seen | INTEGER | Last activity timestamp |
| reconnection_token | TEXT | Token for reconnection |

#### 4. `game_events`
Audit log of important game events.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| game_session_id | INTEGER | Foreign key to game_sessions |
| event_type | TEXT | Type of event (e.g., 'player_joined', 'game_started') |
| player_id | INTEGER | Foreign key to players (null for system events) |
| event_data | TEXT | JSON string with event details |
| created_at | INTEGER | Timestamp |

## Room Lifecycle Integration

### LobbyRoom

#### onCreate
- Creates a `game_sessions` record with type 'lobby'
- Logs 'lobby_created' event

#### onAuth
- Checks for reconnection token
- Validates userId and username

#### onJoin
- Creates/updates player in `players` table
- Creates `player_sessions` record
- Handles reconnection if token is provided
- Logs 'player_joined' event

#### onLeave
- If disconnected (not consented):
  - Generates reconnection token
  - Allows indefinite reconnection (until game ends)
  - Updates status to 'disconnected'
- If left permanently:
  - Updates status to 'left' or 'kicked'
  - Logs 'player_left' event

#### Message Handlers
- **approve-player**: Updates approval status in database
- **kick-player**: Updates status to 'kicked' before removing
- **start-game**: Marks game as started in database

#### onDispose
- Marks game session as 'completed' or 'abandoned'
- Logs 'lobby_disposed' event

### GameRoom

#### onCreate
- Creates a `game_sessions` record with type 'game'
- Sets up simulation interval to update player last_seen every 5 seconds
- Logs 'game_created' event

#### onAuth
- Same as LobbyRoom

#### onJoin
- Creates/updates player
- Handles reconnection (restores health and state)
- Creates player session with initial health
- Logs 'player_joined' event

#### onLeave
- Same reconnection logic as LobbyRoom
- Allows players to reconnect until game ends

#### Message Handlers
- **move**: Logs player movement
- **action**: Logs player actions
- **update-health**: Updates health in database

#### onDispose
- Marks game session as 'completed'
- Logs 'game_disposed' event

## Reconnection System

### How It Works

1. **Player Disconnects** (unexpected)
   - Room generates a reconnection token
   - Stores token in `player_sessions` table
   - Calls `allowReconnection(client, "manual")` - indefinite reconnection
   - Updates player status to 'disconnected'
   - **Player state remains in room** - not deleted!

2. **Player Reconnects**
   - Client provides reconnection token in join options
   - `onAuth` validates token and returns player session
   - `onJoin` restores player state (health, position, etc.)
   - Updates sessionId and marks as 'connected'

3. **Player Leaves Permanently**
   - If consented (intentional leave):
     - Updates status to 'left'
     - Removes from room state
   - Game data persists in database for history

### Client Implementation

```typescript
// When disconnected, store the reconnection info
room.onLeave((code) => {
  if (code !== 1000) { // Not a normal close
    const sessionId = room.sessionId;
    const roomId = room.id;
    // Store these for reconnection
    localStorage.setItem('reconnect_session', sessionId);
    localStorage.setItem('reconnect_room', roomId);
  }
});

// On reconnect attempt
const reconnectSession = localStorage.getItem('reconnect_session');
const reconnectRoom = localStorage.getItem('reconnect_room');

if (reconnectSession && reconnectRoom) {
  const room = await client.reconnect(reconnectRoom, reconnectSession);
  // Clear stored data
  localStorage.removeItem('reconnect_session');
  localStorage.removeItem('reconnect_room');
}
```

## REST API Endpoints

The server now runs two servers:
- **WebSocket Server** (port 2567): Colyseus game server
- **REST API Server** (port 3000): HTTP API for queries

### Player Endpoints

#### GET /api/players
Get all players.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": "user123",
      "username": "Player1",
      "character_name": "Aragorn",
      "created_at": 1707419520000,
      "updated_at": 1707419520000
    }
  ]
}
```

#### GET /api/players/:userId
Get specific player by userId.

#### GET /api/players/:userId/history
Get player's game history.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "room_id": "ABC123",
      "room_type": "game",
      "room_code": "ABC1",
      "game_status": "completed",
      "player_status": "left",
      "joined_at": 1707419520000,
      "left_at": 1707420000000,
      "approved": true,
      "health": 75
    }
  ]
}
```

### Game Session Endpoints

#### GET /api/games
Get all active games.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "room_id": "ABC123",
      "room_type": "lobby",
      "room_code": "ABC1",
      "dm_id": "session123",
      "status": "active",
      "max_players": 6,
      "currentPlayers": 3,
      "created_at": 1707419520000,
      "started_at": null,
      "ended_at": null
    }
  ]
}
```

#### GET /api/games/:roomId
Get game session details by roomId.

#### GET /api/games/code/:roomCode
Get game session by 4-character room code.

#### GET /api/games/:roomId/players
Get all players in a game.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "game_session_id": 1,
      "player_id": 1,
      "session_id": "session123",
      "status": "connected",
      "approved": true,
      "health": 100,
      "joined_at": 1707419520000,
      "last_seen": 1707419600000,
      "player": {
        "id": 1,
        "user_id": "user123",
        "username": "Player1",
        "character_name": "Aragorn"
      }
    }
  ]
}
```

#### GET /api/games/:roomId/events
Get event log for a game session.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "game_session_id": 1,
      "event_type": "lobby_created",
      "player_id": null,
      "event_data": {
        "roomCode": "ABC1",
        "maxClients": 6
      },
      "created_at": 1707419520000
    },
    {
      "id": 2,
      "game_session_id": 1,
      "event_type": "player_joined",
      "player_id": 1,
      "event_data": {
        "username": "Player1",
        "characterName": "Aragorn",
        "isDM": true
      },
      "created_at": 1707419525000,
      "player": {
        "id": 1,
        "user_id": "user123",
        "username": "Player1"
      }
    }
  ]
}
```

#### GET /api/sessions/:sessionId
Get player session details by Colyseus sessionId.

#### GET /api/health
Health check endpoint.

## Database Services

All database operations are handled through service classes in [database/services.ts](database/services.ts):

### PlayerService

```typescript
// Create or update player
const player = PlayerService.createOrUpdate(userId, username, characterName);

// Get player by userId
const player = PlayerService.getByUserId(userId);

// Get all players
const players = PlayerService.getAll();
```

### GameSessionService

```typescript
// Create game session
const session = GameSessionService.create(roomId, 'lobby', dmId, roomCode, maxPlayers);

// Get by roomId
const session = GameSessionService.getByRoomId(roomId);

// Get by room code
const session = GameSessionService.getByRoomCode('ABC1');

// Update status
GameSessionService.updateStatus(roomId, 'completed');

// Mark game as started
GameSessionService.markGameStarted(roomId);

// Get player count
const count = GameSessionService.getPlayerCount(roomId);
```

### PlayerSessionService

```typescript
// Create player session
const session = PlayerSessionService.create(gameSessionId, playerId, sessionId, approved);

// Update status
PlayerSessionService.updateStatus(sessionId, 'disconnected');

// Update health
PlayerSessionService.updateHealth(sessionId, 75);

// Set reconnection token
PlayerSessionService.setReconnectionToken(sessionId, token);

// Find by reconnection token
const session = PlayerSessionService.findByReconnectionToken(token);

// Get player game history
const history = PlayerSessionService.getPlayerGameHistory(playerId);
```

### GameEventService

```typescript
// Log an event
GameEventService.log(gameSessionId, 'player_joined', playerId, {
  username: 'Player1',
  health: 100
});

// Get all events for a game
const events = GameEventService.getByGameSession(gameSessionId);
```

## Event Types

The following event types are logged:

### Lobby Events
- `lobby_created` - Lobby room created
- `player_joined` - Player joined lobby
- `player_reconnected` - Player reconnected to lobby
- `player_left` - Player left lobby
- `player_approved` - DM approved/rejected player
- `player_kicked` - DM kicked player
- `game_started` - DM started the game
- `dm_left` - DM left the lobby
- `lobby_disposed` - Lobby room disposed

### Game Events
- `game_created` - Game room created
- `player_joined` - Player joined game
- `player_reconnected` - Player reconnected to game
- `player_left` - Player left game
- `player_moved` - Player moved (if tracking movement)
- `player_action` - Player performed an action
- `health_changed` - Player health changed
- `game_disposed` - Game room disposed

## Database File Location

The SQLite database is stored at:
```
backend/game_server/database/game_server.db
```

You can change this location by setting the `DB_PATH` environment variable:
```bash
export DB_PATH=/path/to/your/database.db
```

## Querying the Database Directly

You can use the `bun:sqlite` API or any SQLite client to query the database:

```typescript
import db from './database/db';

// Raw SQL query
const result = db.prepare("SELECT * FROM players WHERE username LIKE ?").all("%Player%");
console.log(result);
```

Or use a GUI tool like [DB Browser for SQLite](https://sqlitebrowser.org/).

## Migration Strategy

The schema is automatically created when the server starts. To modify the schema:

1. Edit [database/schema.sql](database/schema.sql)
2. Either:
   - Delete the `game_server.db` file (loses all data)
   - Write a migration script using raw SQL

Example migration script:
```typescript
import db from './database/db';

// Add a new column
db.exec("ALTER TABLE players ADD COLUMN email TEXT");
```

## Performance Considerations

- **Indexes**: The schema includes indexes on frequently queried columns
- **WAL Mode**: Write-Ahead Logging is enabled for better concurrency
- **Batch Updates**: Use transactions for multiple writes
- **Last Seen Updates**: Updated every 5 seconds (not on every message)

## Future Enhancements

Potential improvements:
- [ ] Snapshot entire game state periodically
- [ ] Add player statistics and achievements
- [ ] Implement game replay from event log
- [ ] Add database backup/restore functionality
- [ ] Implement soft deletes instead of hard deletes
- [ ] Add rate limiting to API endpoints
- [ ] Add authentication to API endpoints
- [ ] Implement WebSocket notifications for real-time updates

## Troubleshooting

### Database locked error
If you see "database is locked" errors, it means multiple processes are trying to write simultaneously. WAL mode should prevent this, but if it persists:
- Check for long-running transactions
- Ensure you're not opening multiple database connections

### Player can't reconnect
Check:
- Is the reconnection token set correctly?
- Is the game session still active?
- Has the player been marked as 'left' or 'kicked'?

Query the database:
```sql
SELECT * FROM player_sessions WHERE session_id = 'your-session-id';
SELECT * FROM game_sessions WHERE room_id = 'your-room-id';
```

### Events not logging
Ensure `this.dbGameSessionId` is set in the room's `onCreate` method.

## Data Purging

### Automatic Cleanup

When a room is disposed (DM and all players have left), the system **automatically purges all data** for that game session from the database. This prevents the database from filling up with old game data.

#### What Gets Purged

When `onDispose()` is called:

1. **All game events** for that session are deleted
2. **All player sessions** for that game are deleted
3. **The game session** itself is deleted
4. **Orphaned players** (players with no game sessions) are deleted

#### Purge Flow

```
Player leaves → Room checks if empty → onDispose() called → Purge data
```

**Example Console Output:**
```
🗑️  GameRoom disposed - all players have left
🧹 Purging game session data from database...
   Deleted 25 game events
   Deleted 4 player sessions
   Deleted 1 game session
✅ Game session completely cleaned up
🗑️  Purged 0 orphaned players
```

#### When Does Purging Happen?

Purging occurs when:
- The DM leaves and all other players have left
- All players leave (even if DM left first)
- The room is destroyed by the server

**Important:** Once purged, the game session data **cannot be recovered**. The final state is logged before purging.

#### Manual Purge

You can manually purge a game session using the service:

```typescript
import { GameSessionService } from './database/services';

// Purge specific game session
GameSessionService.purgeGameSession('roomId123');

// Purge all orphaned players
GameSessionService.purgeOrphanedPlayers();
```

#### What Data Persists?

The `players` table is preserved if the player has participated in other games. Only completely orphaned players (those with zero game sessions) are deleted.

This means:
- ✅ Player records persist across multiple games
- ✅ You can query historical player data if they've joined other games
- ❌ Individual game session data is deleted when the room ends

#### Preventing Purge (If Needed)

If you want to keep game session data for analytics or history, you can comment out the purge calls in `onDispose()`:

```typescript
override onDispose() {
  console.log("🗑️  Room disposed");

  // Log final event
  GameEventService.log(this.dbGameSessionId!, 'game_disposed', undefined, {
    finalPlayerCount: this.state.players.size,
  });

  // Comment these out to preserve data:
  // GameSessionService.purgeGameSession(this.roomId);
  // GameSessionService.purgeOrphanedPlayers();
}
```

## Summary

You now have a complete database-backed Colyseus server with:
✅ Persistent player and game data
✅ Reconnection support until game ends
✅ Complete event logging
✅ REST API for external queries
✅ Type-safe service layer
✅ Automatic data cleanup when games end

All room lifecycle events are integrated with the database, allowing players to disconnect and reconnect seamlessly! When the game ends and everyone leaves, all session data is automatically purged to keep your database clean.
