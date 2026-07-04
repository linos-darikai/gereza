-- SQLite Schema for Game Server

-- Players table - stores persistent player information
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    character_name TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Game sessions table - tracks all game rooms
CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT UNIQUE NOT NULL,
    room_type TEXT NOT NULL, -- 'lobby' or 'game'
    room_code TEXT,
    dm_id TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    max_players INTEGER DEFAULT 6,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    started_at INTEGER,
    ended_at INTEGER,
    metadata TEXT -- JSON string for additional room data
);

-- Player sessions table - tracks players in specific game sessions
CREATE TABLE IF NOT EXISTS player_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    session_id TEXT NOT NULL, -- Colyseus sessionId
    status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'disconnected', 'left', 'kicked'
    approved BOOLEAN DEFAULT 0,
    health INTEGER,
    joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    left_at INTEGER,
    last_seen INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    reconnection_token TEXT,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(game_session_id, session_id)
);

-- Game events table - optional logging of important game events
CREATE TABLE IF NOT EXISTS game_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'player_joined', 'player_left', 'game_started', 'turn_change', etc.
    player_id INTEGER,
    event_data TEXT, -- JSON string
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_code ON game_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_player_sessions_game_session ON player_sessions(game_session_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_player ON player_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_status ON player_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_events_game_session ON game_events(game_session_id);
