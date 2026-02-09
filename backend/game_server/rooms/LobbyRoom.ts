// backend/src/rooms/LobbyRoom.ts
import { Room, type Client } from '@colyseus/core';
import { LobbyState, Player } from '../schemas/LobbyState';
import {
  PlayerService,
  GameSessionService,
  PlayerSessionService,
  GameEventService,
} from '../database/services';

interface JoinOptions {
  userId?: string;  // 🔥 Made optional - will generate if not provided
  username: string;
  characterName?: string;
  isDM?: boolean;
  reconnectionToken?: string;
}

export class LobbyRoom extends Room<LobbyState> {
  override maxClients = 7;
  private dbGameSessionId?: number;

  override onCreate(options: { roomCode?: string; isDM?: boolean }) {
    console.log("🎲 LobbyRoom onCreate called with:", options);

    // Set the roomId to match the invite code or generate one
    this.roomId = options.roomCode || this.generateRoomId();

    this.setState(new LobbyState());
    this.state.roomCode = this.roomId;
    // dmId will be set in onJoin when the DM connects

    // 🔥 Create game session in database
    const gameSession = GameSessionService.create(
      this.roomId,
      'lobby',
      undefined,
      this.roomId,
      this.maxClients
    );
    this.dbGameSessionId = gameSession.id;

    GameEventService.log(this.dbGameSessionId, 'lobby_created', undefined, {
      roomCode: this.roomId,
      maxClients: this.maxClients,
    });

    console.log("✅ LobbyRoom created with ID:", this.roomId, "DB ID:", this.dbGameSessionId);

    this.setupMessageHandlers();
  }

  generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  setupMessageHandlers() {
    this.onMessage("approve-player", (client, data: { playerId: string; approved: boolean }) => {
      if (client.sessionId !== this.state.dmId) {
        console.log("⚠️  Non-DM tried to approve player");
        return;
      }

      const player = this.state.players.get(data.playerId);
      if (player) {
        player.approved = data.approved;
        player.status = data.approved ? "approved" : "rejected";
        console.log(`${data.approved ? '✅' : '❌'} Player ${player.username} ${player.status}`);

        // 🔥 Update database
        PlayerSessionService.updateApproval(data.playerId, data.approved);

        const dbPlayer = PlayerService.getByUserId(player.userId);
        if (dbPlayer) {
          GameEventService.log(this.dbGameSessionId!, 'player_approved', dbPlayer.id, {
            approved: data.approved,
            username: player.username,
          });
        }
      }
    });

    this.onMessage("kick-player", (client, data: { playerId: string }) => {
      if (client.sessionId !== this.state.dmId) return;

      // 🔥 Update database before kicking
      PlayerSessionService.updateStatus(data.playerId, 'kicked');

      const player = this.state.players.get(data.playerId);
      if (player) {
        const dbPlayer = PlayerService.getByUserId(player.userId);
        if (dbPlayer) {
          GameEventService.log(this.dbGameSessionId!, 'player_kicked', dbPlayer.id, {
            username: player.username,
          });
        }
      }

      this.clients.forEach(c => {
        if (c.sessionId === data.playerId) {
          c.leave(4000);
        }
      });
    });

    this.onMessage("start-game", async (client) => {
      if (client.sessionId !== this.state.dmId) {
        console.log("⚠️  Non-DM tried to start game");
        return;
      }

      const approvedPlayers: Player[] = [];
      this.state.players.forEach((p: Player) => {
        if (p.approved) approvedPlayers.push(p);
      });

      if (approvedPlayers.length === 0) {
        client.send("error", { message: "No approved players to start game" });
        return;
      }

      this.state.gameStarted = true;

      // 🔥 Mark game as started in database
      GameSessionService.markGameStarted(this.roomId);
      GameEventService.log(this.dbGameSessionId!, 'game_started', undefined, {
        approvedPlayerCount: approvedPlayers.length,
      });

      // 🔥 The gameRoomId is the same as the lobby roomCode - GameRoom will be created 
      // when clients join with this code. Broadcast to all clients so they can join.
      this.broadcast("game-starting", {
        message: "Game is starting! Transitioning to game room...",
        gameRoomId: this.state.roomCode,  // Use the same room code
        dmSessionId: this.state.dmId,
        players: approvedPlayers.map(p => ({
          sessionId: p.sessionId,
          username: p.username,
          characterName: p.characterName
        }))
      });

      console.log("🎮 Game started by DM, gameRoomId:", this.state.roomCode);
    });
  }

  override async onAuth(client: Client, options: JoinOptions) {
    // 🔥 Handle reconnection
    if (options.reconnectionToken) {
      const playerSession = PlayerSessionService.findByReconnectionToken(options.reconnectionToken);
      if (playerSession) {
        console.log("🔄 Player reconnecting with token");
        return { reconnecting: true, playerSession };
      }
    }

    // 🔥 Generate userId if not provided
    if (!options.userId) {
      options.userId = `user_${client.sessionId}_${Date.now()}`;
      console.log(`Generated userId: ${options.userId} for ${options.username}`);
    }

    // Validate username is provided
    if (!options.username) {
      throw new Error("username is required");
    }

    return true;
  }

  override onJoin(client: Client, options: JoinOptions, auth?: any) {
    console.log(`👤 ${options.username} joining...`);

    // 🔥 Ensure userId is set (should be set in onAuth, but fallback just in case)
    const userId = options.userId || `user_${client.sessionId}_${Date.now()}`;

    // 🔥 Create or update player in database
    const dbPlayer = PlayerService.createOrUpdate(
      userId,
      options.username,
      options.characterName
    );

    // 🔥 Check if this is a reconnection
    const isReconnecting = auth?.reconnecting && auth?.playerSession;

    if (isReconnecting) {
      // Restore player from database
      const oldSessionId = auth.playerSession.session_id;
      const oldPlayer = this.state.players.get(oldSessionId);

      if (oldPlayer) {
        // Update session ID and reconnect
        this.state.players.delete(oldSessionId);
        oldPlayer.sessionId = client.sessionId;
        this.state.players.set(client.sessionId, oldPlayer);

        // Update database
        PlayerSessionService.updateStatus(oldSessionId, 'left');
        PlayerSessionService.create(
          this.dbGameSessionId!,
          dbPlayer.id,
          client.sessionId,
          oldPlayer.approved
        );

        console.log(`🔄 Player ${options.username} reconnected`);
        client.send("reconnected", { message: "Successfully reconnected!" });

        GameEventService.log(this.dbGameSessionId!, 'player_reconnected', dbPlayer.id, {
          username: options.username,
        });

        return;
      }
    }

    // Normal join flow
    const player = new Player();
    player.sessionId = client.sessionId;
    player.userId = userId;  // Use the ensured userId
    player.username = options.username;
    player.characterName = options.characterName || "Unnamed Hero";
    player.joinedAt = Date.now();

    if (options.isDM) {
      console.log("🎩 DM joined:", options.username);
      this.state.dmId = client.sessionId;
      player.approved = true;
      player.status = "approved"; // DM is always approved

      // Update database with DM info
      GameSessionService.setDmId(this.roomId, client.sessionId);
    } else {
      player.approved = false;
      player.status = "pending";
      console.log(`⏳ Player ${player.username} waiting for approval`);
      client.send("waiting-approval", { message: "Waiting for DM approval..." });
    }

    this.state.players.set(client.sessionId, player);

    // 🔥 Create player session in database
    PlayerSessionService.create(
      this.dbGameSessionId!,
      dbPlayer.id,
      client.sessionId,
      player.approved
    );

    GameEventService.log(this.dbGameSessionId!, 'player_joined', dbPlayer.id, {
      username: options.username,
      characterName: options.characterName,
      isDM: options.isDM || false,
    });

    // Notify DM of new player (if it's not the DM themselves joining)
    if (!options.isDM) {
      this.clients.forEach(c => {
        if (c.sessionId === this.state.dmId) {
          c.send("player-joined", {
            player: {
              sessionId: player.sessionId,
              username: player.username,
              characterName: player.characterName
            }
          });
        }
      });
    }
  }

  override async onLeave(client: Client, consented?: boolean) {
    console.log(`👋 Client ${client.sessionId} left (consented: ${consented})`);

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // 🔥 Allow reconnection if game hasn't ended (until game ends as per user requirement)
    if (!consented) {
      try {
        // Generate reconnection token
        const reconnectionToken = `${client.sessionId}_${Date.now()}`;
        PlayerSessionService.setReconnectionToken(client.sessionId, reconnectionToken);

        // Allow reconnection indefinitely (until game ends)
        await this.allowReconnection(client, "manual");

        // Update status to disconnected but keep player in room
        PlayerSessionService.updateStatus(client.sessionId, 'disconnected');

        console.log(`⏸️  Player ${player.username} disconnected - can reconnect anytime`);

        if (client.sessionId === this.state.dmId) {
          this.broadcast("dm-left", { message: "DM disconnected. Waiting for return..." });
        }

        return; // Don't remove player from state - they can reconnect
      } catch (e) {
        console.error("Failed to allow reconnection:", e);
      }
    }

    // Player intentionally left or couldn't set up reconnection
    if (client.sessionId === this.state.dmId) {
      console.log("🎩 DM left permanently - ending lobby");
      this.broadcast("dm-left-permanent", { message: "DM has left the game" });

      // 🔥 Update database - mark as abandoned
      GameSessionService.updateStatus(this.roomId, 'abandoned');
      GameEventService.log(this.dbGameSessionId!, 'dm_left', undefined, {
        reason: 'DM left permanently',
      });
    }

    // 🔥 Update database
    PlayerSessionService.updateStatus(client.sessionId, consented ? 'left' : 'kicked');

    const dbPlayer = PlayerService.getByUserId(player.userId);
    if (dbPlayer) {
      GameEventService.log(this.dbGameSessionId!, 'player_left', dbPlayer.id, {
        username: player.username,
        consented,
      });
    }

    // Remove from room state
    this.state.players.delete(client.sessionId);
    console.log(`👋 Player ${player.username} left permanently`);
  }

  override onDispose() {
    console.log("🗑️  LobbyRoom disposed - all players have left");

    // Log final event before purging
    const status = this.state.gameStarted ? 'completed' : 'abandoned';
    GameEventService.log(this.dbGameSessionId!, 'lobby_disposed', undefined, {
      status,
      finalPlayerCount: this.state.players.size,
    });

    // 🔥 Purge all game session data from database
    // This happens when DM and all players have left
    console.log("🧹 Purging lobby session data from database...");
    GameSessionService.purgeGameSession(this.roomId);

    // Optional: Clean up orphaned players (players with no game sessions)
    GameSessionService.purgeOrphanedPlayers();

    console.log("✅ Lobby session completely cleaned up");
  }
}