// backend/game_server/api/routes.ts
import { Router, type Request, type Response } from 'express';
import {
  PlayerService,
  GameSessionService,
  PlayerSessionService,
  GameEventService,
} from '../database/services';

const router = Router();

// ============================================
// PLAYER ENDPOINTS
// ============================================

/**
 * GET /api/players
 * Get all players
 */
router.get('/players', (_req: Request, res: Response) => {
  try {
    const players = PlayerService.getAll();
    res.json({ success: true, data: players });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/players/:userId
 * Get player by userId
 */
router.get('/players/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const player = PlayerService.getByUserId(userId);

    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    res.json({ success: true, data: player });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/players/:userId/history
 * Get player's game history
 */
router.get('/players/:userId/history', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const player = PlayerService.getByUserId(userId);

    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const history = PlayerSessionService.getPlayerGameHistory(player.id);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GAME SESSION ENDPOINTS
// ============================================

/**
 * GET /api/games
 * Get all active games
 */
router.get('/games', (_req: Request, res: Response) => {
  try {
    const games = GameSessionService.getActiveGames();

    // Enrich with player count
    const enrichedGames = games.map(game => ({
      ...game,
      currentPlayers: GameSessionService.getPlayerCount(game.room_id),
    }));

    res.json({ success: true, data: enrichedGames });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/games/:roomId
 * Get game session details by roomId
 */
router.get('/games/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const game = GameSessionService.getByRoomId(roomId);

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const playerCount = GameSessionService.getPlayerCount(roomId);

    res.json({
      success: true,
      data: {
        ...game,
        currentPlayers: playerCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/games/code/:roomCode
 * Get game session by room code
 */
router.get('/games/code/:roomCode', (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const game = GameSessionService.getByRoomCode(roomCode);

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const playerCount = GameSessionService.getPlayerCount(game.room_id);

    res.json({
      success: true,
      data: {
        ...game,
        currentPlayers: playerCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/games/:roomId/players
 * Get all players in a game session
 */
router.get('/games/:roomId/players', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const game = GameSessionService.getByRoomId(roomId);

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const playerSessions = PlayerSessionService.getActiveByGameSession(game.id);

    // Enrich with player details
    const enrichedPlayers = playerSessions.map(ps => {
      const player = PlayerService.getById(ps.player_id);
      return {
        ...ps,
        player: player,
      };
    });

    res.json({ success: true, data: enrichedPlayers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/games/:roomId/events
 * Get all events for a game session
 */
router.get('/games/:roomId/events', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const game = GameSessionService.getByRoomId(roomId);

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const events = GameEventService.getByGameSession(game.id);

    // Enrich with player details
    const enrichedEvents = events.map(event => {
      if (event.player_id) {
        const player = PlayerService.getById(event.player_id);
        return {
          ...event,
          player: player,
          event_data: event.event_data ? JSON.parse(event.event_data) : null,
        };
      }
      return {
        ...event,
        event_data: event.event_data ? JSON.parse(event.event_data) : null,
      };
    });

    res.json({ success: true, data: enrichedEvents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get player session details by Colyseus sessionId
 */
router.get('/sessions/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const playerSession = PlayerSessionService.getBySessionId(sessionId);

    if (!playerSession) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Enrich with player and game details
    const player = PlayerService.getById(playerSession.player_id);
    const game = GameSessionService.getByRoomId(
      // We need to get the game from the game_session_id
      playerSession.game_session_id.toString() // This won't work, we need a different approach
    );

    res.json({
      success: true,
      data: {
        ...playerSession,
        player,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: Date.now(),
  });
});

export default router;
