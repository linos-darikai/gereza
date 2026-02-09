// backend/game_server/database/services.ts
import db from "./db";

// Types
export interface Player {
  id: number;
  user_id: string;
  username: string;
  character_name: string | null;
  created_at: number;
  updated_at: number;
}

export interface GameSession {
  id: number;
  room_id: string;
  room_type: "lobby" | "game";
  room_code: string | null;
  dm_id: string | null;
  status: "active" | "completed" | "abandoned";
  max_players: number;
  created_at: number;
  started_at: number | null;
  ended_at: number | null;
  metadata: string | null;
}

export interface PlayerSession {
  id: number;
  game_session_id: number;
  player_id: number;
  session_id: string;
  status: "connected" | "disconnected" | "left" | "kicked";
  approved: boolean;
  health: number | null;
  joined_at: number;
  left_at: number | null;
  last_seen: number;
  reconnection_token: string | null;
}

export interface GameEvent {
  id: number;
  game_session_id: number;
  event_type: string;
  player_id: number | null;
  event_data: string | null;
  created_at: number;
}

// Player Services
export class PlayerService {
  static createOrUpdate(userId: string, username: string, characterName?: string): Player {
    const stmt = db.prepare(`
      INSERT INTO players (user_id, username, character_name, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        character_name = COALESCE(excluded.character_name, character_name),
        updated_at = excluded.updated_at
      RETURNING *
    `);

    return stmt.get(userId, username, characterName || null, Date.now()) as Player;
  }

  static getByUserId(userId: string): Player | null {
    const stmt = db.prepare("SELECT * FROM players WHERE user_id = ?");
    return stmt.get(userId) as Player | null;
  }

  static getById(id: number): Player | null {
    const stmt = db.prepare("SELECT * FROM players WHERE id = ?");
    return stmt.get(id) as Player | null;
  }

  static getAll(): Player[] {
    const stmt = db.prepare("SELECT * FROM players ORDER BY created_at DESC");
    return stmt.all() as Player[];
  }
}

// Game Session Services
export class GameSessionService {
  static create(
    roomId: string,
    roomType: "lobby" | "game",
    dmId?: string,
    roomCode?: string,
    maxPlayers: number = 6
  ): GameSession {
    // 🔥 Use INSERT ... ON CONFLICT to handle when lobby transitions to game
    // This updates the existing session if the room_id already exists
    const stmt = db.prepare(`
      INSERT INTO game_sessions (room_id, room_type, dm_id, room_code, status, max_players, created_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT(room_id) DO UPDATE SET
        room_type = excluded.room_type,
        dm_id = COALESCE(excluded.dm_id, dm_id),
        status = 'active'
      RETURNING *
    `);

    return stmt.get(
      roomId,
      roomType,
      dmId || null,
      roomCode || null,
      maxPlayers,
      Date.now()
    ) as GameSession;
  }

  static getByRoomId(roomId: string): GameSession | null {
    const stmt = db.prepare("SELECT * FROM game_sessions WHERE room_id = ?");
    return stmt.get(roomId) as GameSession | null;
  }

  static getByRoomCode(roomCode: string): GameSession | null {
    const stmt = db.prepare("SELECT * FROM game_sessions WHERE room_code = ? AND status = 'active'");
    return stmt.get(roomCode) as GameSession | null;
  }

  static getActiveGames(): GameSession[] {
    const stmt = db.prepare("SELECT * FROM game_sessions WHERE status = 'active' ORDER BY created_at DESC");
    return stmt.all() as GameSession[];
  }

  static updateStatus(roomId: string, status: "active" | "completed" | "abandoned"): void {
    const stmt = db.prepare(`
      UPDATE game_sessions
      SET status = ?,
          ended_at = CASE WHEN ? IN ('completed', 'abandoned') THEN ? ELSE ended_at END
      WHERE room_id = ?
    `);
    stmt.run(status, status, Date.now(), roomId);
  }

  static markGameStarted(roomId: string): void {
    const stmt = db.prepare(`
      UPDATE game_sessions
      SET started_at = ?
      WHERE room_id = ? AND started_at IS NULL
    `);
    stmt.run(Date.now(), roomId);
  }

  static setDmId(roomId: string, dmId: string): void {
    const stmt = db.prepare("UPDATE game_sessions SET dm_id = ? WHERE room_id = ?");
    stmt.run(dmId, roomId);
  }

  static getPlayerCount(roomId: string): number {
    const session = this.getByRoomId(roomId);
    if (!session) return 0;

    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM player_sessions
      WHERE game_session_id = ? AND status IN ('connected', 'disconnected')
    `);
    const result = stmt.get(session.id) as { count: number };
    return result.count;
  }

  /**
   * Purges all data for a game session
   * This includes player_sessions, game_events, and the game_session itself
   * WARNING: This is irreversible!
   */
  static purgeGameSession(roomId: string): void {
    const session = this.getByRoomId(roomId);
    if (!session) {
      console.warn(`Cannot purge game session ${roomId} - not found`);
      return;
    }

    console.log(`🗑️  Purging game session ${roomId} (DB ID: ${session.id})...`);

    // Delete in order due to foreign key constraints
    // 1. Delete game events
    const deleteEvents = db.prepare("DELETE FROM game_events WHERE game_session_id = ?");
    const eventsResult = deleteEvents.run(session.id);
    console.log(`   Deleted ${eventsResult.changes} game events`);

    // 2. Delete player sessions
    const deletePlayerSessions = db.prepare("DELETE FROM player_sessions WHERE game_session_id = ?");
    const sessionsResult = deletePlayerSessions.run(session.id);
    console.log(`   Deleted ${sessionsResult.changes} player sessions`);

    // 3. Delete the game session itself
    const deleteGameSession = db.prepare("DELETE FROM game_sessions WHERE id = ?");
    const gameResult = deleteGameSession.run(session.id);
    console.log(`   Deleted ${gameResult.changes} game session`);

    console.log(`✅ Game session ${roomId} purged successfully`);
  }

  /**
   * Purges orphaned players who have no game sessions
   * Only deletes players that have never joined any game
   */
  static purgeOrphanedPlayers(): number {
    const stmt = db.prepare(`
      DELETE FROM players
      WHERE id NOT IN (
        SELECT DISTINCT player_id FROM player_sessions
      )
    `);
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`🗑️  Purged ${result.changes} orphaned players`);
    }
    return result.changes;
  }
}

// Player Session Services
export class PlayerSessionService {
  static create(
    gameSessionId: number,
    playerId: number,
    sessionId: string,
    approved: boolean = false
  ): PlayerSession {
    const stmt = db.prepare(`
      INSERT INTO player_sessions (
        game_session_id, player_id, session_id, status, approved, joined_at, last_seen
      )
      VALUES (?, ?, ?, 'connected', ?, ?, ?)
      ON CONFLICT(game_session_id, session_id) DO UPDATE SET
        status = 'connected',
        last_seen = excluded.last_seen
      RETURNING *
    `);

    const now = Date.now();
    return stmt.get(gameSessionId, playerId, sessionId, approved ? 1 : 0, now, now) as PlayerSession;
  }

  static getBySessionId(sessionId: string): PlayerSession | null {
    const stmt = db.prepare(`
      SELECT * FROM player_sessions
      WHERE session_id = ?
      ORDER BY joined_at DESC
      LIMIT 1
    `);
    return stmt.get(sessionId) as PlayerSession | null;
  }

  static getActiveByGameSession(gameSessionId: number): PlayerSession[] {
    const stmt = db.prepare(`
      SELECT * FROM player_sessions
      WHERE game_session_id = ? AND status IN ('connected', 'disconnected')
      ORDER BY joined_at ASC
    `);
    return stmt.all(gameSessionId) as PlayerSession[];
  }

  static updateStatus(
    sessionId: string,
    status: "connected" | "disconnected" | "left" | "kicked"
  ): void {
    const stmt = db.prepare(`
      UPDATE player_sessions
      SET status = ?,
          left_at = CASE WHEN ? IN ('left', 'kicked') THEN ? ELSE left_at END,
          last_seen = ?
      WHERE session_id = ?
    `);
    stmt.run(status, status, Date.now(), Date.now(), sessionId);
  }

  static updateLastSeen(sessionId: string): void {
    const stmt = db.prepare("UPDATE player_sessions SET last_seen = ? WHERE session_id = ?");
    stmt.run(Date.now(), sessionId);
  }

  static setReconnectionToken(sessionId: string, token: string): void {
    const stmt = db.prepare("UPDATE player_sessions SET reconnection_token = ? WHERE session_id = ?");
    stmt.run(token, sessionId);
  }

  static findByReconnectionToken(token: string): PlayerSession | null {
    const stmt = db.prepare(`
      SELECT * FROM player_sessions
      WHERE reconnection_token = ? AND status = 'disconnected'
      LIMIT 1
    `);
    return stmt.get(token) as PlayerSession | null;
  }

  static updateApproval(sessionId: string, approved: boolean): void {
    const stmt = db.prepare("UPDATE player_sessions SET approved = ? WHERE session_id = ?");
    stmt.run(approved ? 1 : 0, sessionId);
  }

  static updateHealth(sessionId: string, health: number): void {
    const stmt = db.prepare("UPDATE player_sessions SET health = ? WHERE session_id = ?");
    stmt.run(health, sessionId);
  }

  static getPlayerGameHistory(playerId: number): any[] {
    const stmt = db.prepare(`
      SELECT
        gs.room_id,
        gs.room_type,
        gs.room_code,
        gs.status as game_status,
        ps.status as player_status,
        ps.joined_at,
        ps.left_at,
        ps.approved,
        ps.health
      FROM player_sessions ps
      JOIN game_sessions gs ON ps.game_session_id = gs.id
      WHERE ps.player_id = ?
      ORDER BY ps.joined_at DESC
    `);
    return stmt.all(playerId) as any[];
  }
}

// Game Event Services
export class GameEventService {
  static log(
    gameSessionId: number,
    eventType: string,
    playerId?: number,
    eventData?: any
  ): void {
    const stmt = db.prepare(`
      INSERT INTO game_events (game_session_id, event_type, player_id, event_data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      gameSessionId,
      eventType,
      playerId || null,
      eventData ? JSON.stringify(eventData) : null,
      Date.now()
    );
  }

  static getByGameSession(gameSessionId: number): GameEvent[] {
    const stmt = db.prepare(`
      SELECT * FROM game_events
      WHERE game_session_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(gameSessionId) as GameEvent[];
  }
}

export default {
  PlayerService,
  GameSessionService,
  PlayerSessionService,
  GameEventService,
};
