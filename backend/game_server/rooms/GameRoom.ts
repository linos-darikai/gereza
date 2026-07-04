// backend/src/rooms/GameRoom.ts
import { Room, type Client } from '@colyseus/core';
import { GameState, Player } from '../schemas/GameState';
import {
  PlayerService,
  GameSessionService,
  PlayerSessionService,
  GameEventService,
} from '../database/services';

interface JoinOptions {
  userId?: string;  // 🔥 Made optional - will generate if not provided
  username: string;
  reconnectionToken?: string;
}

export class GameRoom extends Room<GameState> {
    override maxClients = 6;
    private dbGameSessionId?: number;

    override onCreate(options: any) {
        console.log("🎮 GameRoom created!", options);
        this.state = new GameState();

        // 🔥 Create game session in database
        const gameSession = GameSessionService.create(
          this.roomId,
          'game',
          undefined,
          undefined,
          this.maxClients
        );
        this.dbGameSessionId = gameSession.id;

        GameEventService.log(this.dbGameSessionId, 'game_created', undefined, {
          maxClients: this.maxClients,
        });

        // Set up game loop with state synchronization
        this.setSimulationInterval(() => {
          // Update game state here (e.g., this.state.round++)

          // Update all player last_seen in database periodically
          this.state.players.forEach((player) => {
            PlayerSessionService.updateLastSeen(player.sessionId);
          });
        }, 5000); // Update every 5 seconds

        this.setupMessageHandlers();
    }

    setupMessageHandlers() {
        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                console.log(`Player ${player.username} moved to ${data.x}, ${data.y}`);

                const dbPlayer = PlayerService.getByUserId(player.userId);
                if (dbPlayer) {
                  GameEventService.log(this.dbGameSessionId!, 'player_moved', dbPlayer.id, {
                    x: data.x,
                    y: data.y,
                  });
                }
            }
        });

        this.onMessage("action", (client, data) => {
            // Handle comprehensive game actions here
            console.log(`Action received from ${client.sessionId}:`, data);

            const player = this.state.players.get(client.sessionId);
            if (player) {
              const dbPlayer = PlayerService.getByUserId(player.userId);
              if (dbPlayer) {
                GameEventService.log(this.dbGameSessionId!, 'player_action', dbPlayer.id, {
                  action: data,
                });
              }
            }
        });

        this.onMessage("update-health", (client, data: { health: number }) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.health = data.health;

                // 🔥 Update health in database
                PlayerSessionService.updateHealth(client.sessionId, data.health);

                const dbPlayer = PlayerService.getByUserId(player.userId);
                if (dbPlayer) {
                  GameEventService.log(this.dbGameSessionId!, 'health_changed', dbPlayer.id, {
                    newHealth: data.health,
                  });
                }
            }
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
        console.log(client.sessionId, "joined!");

        // 🔥 Ensure userId is set (should be set in onAuth, but fallback just in case)
        const userId = options.userId || `user_${client.sessionId}_${Date.now()}`;

        // 🔥 Create or update player in database
        const dbPlayer = PlayerService.createOrUpdate(
          userId,
          options.username
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
              true
            );
            PlayerSessionService.updateHealth(client.sessionId, oldPlayer.health);

            console.log(`🔄 Player ${options.username} reconnected with health ${oldPlayer.health}`);
            client.send("reconnected", {
              message: "Successfully reconnected!",
              health: oldPlayer.health,
            });

            GameEventService.log(this.dbGameSessionId!, 'player_reconnected', dbPlayer.id, {
              username: options.username,
              health: oldPlayer.health,
            });

            return;
          }
        }

        // Normal join flow
        const player = new Player();
        player.sessionId = client.sessionId;
        player.username = options.username;
        player.userId = userId;  // Use the ensured userId
        player.health = Math.floor(Math.random() * 100); // random health

        this.state.players.set(client.sessionId, player);

        // 🔥 Create player session in database
        PlayerSessionService.create(
          this.dbGameSessionId!,
          dbPlayer.id,
          client.sessionId,
          true
        );
        PlayerSessionService.updateHealth(client.sessionId, player.health);

        GameEventService.log(this.dbGameSessionId!, 'player_joined', dbPlayer.id, {
          username: options.username,
          health: player.health,
        });
    }

    override async onLeave(client: Client, consented?: boolean) {
        console.log(client.sessionId, "left!", "consented:", consented);

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        // 🔥 Allow reconnection until game ends (as per user requirement)
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
            this.broadcast("player-disconnected", {
              sessionId: client.sessionId,
              username: player.username,
            }, { except: client });

            return; // Don't remove player from state - they can reconnect
          } catch (e) {
            console.error("Failed to allow reconnection:", e);
          }
        }

        // Player intentionally left
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
        console.log("🗑️  GameRoom disposed - all players have left");

        // Log final event before purging
        GameEventService.log(this.dbGameSessionId!, 'game_disposed', undefined, {
          finalPlayerCount: this.state.players.size,
          finalRound: this.state.round,
        });

        // 🔥 Purge all game session data from database
        // This happens when DM and all players have left
        console.log("🧹 Purging game session data from database...");
        GameSessionService.purgeGameSession(this.roomId);

        // Optional: Clean up orphaned players (players with no game sessions)
        GameSessionService.purgeOrphanedPlayers();

        console.log("✅ Game session completely cleaned up");
    }
}
