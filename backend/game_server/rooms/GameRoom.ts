// backend/game_server/rooms/GameRoom.ts
import { Room, type Client } from '@colyseus/core';
import {
  GameState,
  Player,
  ChatMessage,
  InventoryItem,
  PlayerInventory
} from '../schemas/GameState';
import {
  PlayerService,
  GameSessionService,
  PlayerSessionService,
  GameEventService,
} from '../database/services';
import {
  generateGameResponse,
  generateIntroScene,
  type AISceneResponse
} from '../ai/gemini';
import { getTranscript, type SessionTranscriptService } from '../services/transcript';
import { SceneImageService } from "../services/sceneImage";

interface JoinOptions {
  userId?: string;
  username: string;
  characterName?: string;
  reconnectionToken?: string;
  roomCode?: string;  // Room code from lobby
}

export class GameRoom extends Room<GameState> {
  override maxClients = 6;
  private dbGameSessionId?: number;

  // 🔥 Session transcript for AI context
  private transcript?: SessionTranscriptService;
  // 🔥 Scene Image Generator
  private sceneImageService!: SceneImageService;

  override async onCreate(options: { roomCode?: string; dmSessionId?: string }) {
    console.log("🎮 GameRoom created!", options);

    // 🔥 Set roomId to match the room code for consistent identification
    if (options.roomCode) {
      this.roomId = options.roomCode;
    }

    this.setState(new GameState());

    // Initialize Image Service
    this.sceneImageService = new SceneImageService(process.env.GEMINI_KEY || "");

    // 🔥 Initialize transcript service
    try {
      this.transcript = await getTranscript(this.roomId);
      this.transcript.addSystem(`Game session started: ${this.roomId}`);
    } catch (error) {
      console.error("Failed to initialize transcript:", error);
    }

    // Set room metadata
    this.state.roomCode = options.roomCode || this.roomId;
    this.state.dmSessionId = options.dmSessionId || '';
    this.state.status = 'waiting';

    // Create game session in database
    const gameSession = GameSessionService.create(
      this.roomId,
      'game',
      options.dmSessionId,
      options.roomCode,
      this.maxClients
    );
    this.dbGameSessionId = gameSession.id;

    GameEventService.log(this.dbGameSessionId, 'game_created', undefined, {
      maxClients: this.maxClients,
      roomCode: options.roomCode,
    });

    // Set up game loop for periodic updates
    this.setSimulationInterval(() => {
      this.state.players.forEach((player) => {
        PlayerSessionService.updateLastSeen(player.sessionId);
      });
    }, 5000);

    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    // Start game - initiates the AI narrative
    this.onMessage("start-game", async (client) => {
      if (this.state.status !== 'waiting') return;

      console.log("🎮 Starting game...");
      this.state.status = 'playing';
      this.state.isProcessing = true;

      // Get all players for context
      const playerContexts = this.getPlayerContexts();

      try {
        // Generate intro scene - AI will also determine first turn
        const response = await generateIntroScene(playerContexts);
        this.applyAIResponse(response, null);
        // 🔥 First turn is now set by AI via response.nextTurn in applyAIResponse
      } catch (error) {
        console.error("Failed to generate intro:", error);
        this.state.isProcessing = false;
      }
    });

    // Player action - main gameplay handler (TURN-BASED)
    this.onMessage("player-action", async (client, data: { action: string }) => {
      if (this.state.status !== 'playing') return;
      if (this.state.isProcessing) {
        client.send("error", { message: "Please wait for the current action to resolve." });
        return;
      }

      // 🔥 TURN-BASED ENFORCEMENT: Only allow current player to act
      if (this.state.currentTurn && this.state.currentTurn !== client.sessionId) {
        client.send("error", { message: `It's not your turn! Waiting for ${this.state.currentTurnName} to act.` });
        return;
      }

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`🎯 ${player.characterName}'s turn: ${data.action}`);
      this.state.isProcessing = true;

      // Add player message to chat history
      const userMessage = new ChatMessage();
      userMessage.id = `msg_${Date.now()}`;
      userMessage.role = 'user';
      userMessage.playerSessionId = client.sessionId;
      userMessage.playerUsername = player.username;
      userMessage.content = data.action;
      userMessage.timestamp = Date.now();
      this.state.chatHistory.push(userMessage);

      // 🔥 Log to transcript
      this.transcript?.addPlayerAction(player.username, player.characterName || player.username, data.action);

      // Get game context
      const playerContexts = this.getPlayerContexts();
      const actingPlayer = playerContexts.find(p => p.sessionId === client.sessionId);
      if (!actingPlayer) {
        this.state.isProcessing = false;
        return;
      }

      const gameContext = {
        currentScene: this.state.currentSceneDescription,
        players: playerContexts,
        messageHistory: this.state.chatHistory.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.role === 'user' ? m.content : m.sceneDescription
        })),
        transcript: this.transcript?.getFullTranscript() // 🔥 Use full transcript context
      };

      try {
        const response = await generateGameResponse(data.action, actingPlayer, gameContext);
        this.applyAIResponse(response, client.sessionId);

        // Log to database
        const dbPlayer = PlayerService.getByUserId(player.userId);
        if (dbPlayer) {
          GameEventService.log(this.dbGameSessionId!, 'player_action', dbPlayer.id, {
            action: data.action,
            scene: response.scene.title,
          });
        }
      } catch (error) {
        console.error("AI generation failed:", error);
        this.state.isProcessing = false;
      }
    });

    // Health update from client (for manual adjustments)
    this.onMessage("update-health", (client, data: { health: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.health = Math.max(0, Math.min(player.maxHealth, data.health));
        PlayerSessionService.updateHealth(client.sessionId, data.health);
      }
    });
  }

  private getPlayerContexts() {
    const contexts: Array<{
      sessionId: string;
      username: string;
      characterName: string;
      health: number;
      maxHealth: number;
      inventory: string[];
    }> = [];

    this.state.players.forEach((player) => {
      const inventory = this.state.inventories.get(player.sessionId);
      const items = inventory ?
        Array.from({ length: inventory.items.length }, (_, i) => inventory.items[i].name) :
        [];

      contexts.push({
        sessionId: player.sessionId,
        username: player.username,
        characterName: player.characterName || player.username,
        health: player.health,
        maxHealth: player.maxHealth,
        inventory: items
      });
    });

    return contexts;
  }

  private applyAIResponse(response: AISceneResponse, actingSessionId: string | null) {
    // Update current scene
    this.state.currentSceneTitle = response.scene.title;
    this.state.currentSceneDescription = response.scene.description;
    this.state.currentSceneMood = response.scene.mood;

    // 🔥 Generate and broadcast scene image
    if (response.scene.description) {
      this.sceneImageService.generate(response.scene.description, response.scene.mood)
        .then(base64 => {
          if (base64) {
            this.broadcast("scene-image", { image: base64 });
          }
        });
    }

    // 🔥 Log scene to transcript
    this.transcript?.addScene(response.scene.title, response.scene.description, response.scene.mood);

    // Add AI response to chat history
    const aiMessage = new ChatMessage();
    aiMessage.id = `msg_${Date.now()}`;
    aiMessage.role = 'assistant';
    aiMessage.sceneTitle = response.scene.title;
    aiMessage.sceneDescription = response.scene.description;
    aiMessage.sceneMood = response.scene.mood;
    aiMessage.timestamp = Date.now();
    this.state.chatHistory.push(aiMessage);

    // Broadcast dice roll if any (Log before state changes)
    if (response.diceRoll) {
      this.broadcast("dice-roll", response.diceRoll);
      this.transcript?.addDiceRoll(
        response.diceRoll.purpose,
        response.diceRoll.result,
        response.diceRoll.dc,
        response.diceRoll.success
      );
    }

    // Apply state changes
    for (const change of response.stateChanges) {
      const player = this.state.players.get(change.playerId);
      if (!player) continue;

      const playerName = player.characterName || player.username;

      // HP changes
      if (change.hpChange !== 0) {
        player.health = Math.max(0, Math.min(player.maxHealth, player.health + change.hpChange));
        PlayerSessionService.updateHealth(change.playerId, player.health);
        this.transcript?.addStateChange(`${playerName} HP ${change.hpChange > 0 ? '+' : ''}${change.hpChange} (${player.health}/${player.maxHealth})`);
      }

      // Status changes
      if (change.newStatus) {
        player.status = change.newStatus;
        this.transcript?.addStateChange(`${playerName} is now ${change.newStatus}`);
      }

      // Add item
      if (change.addItem) {
        let inventory = this.state.inventories.get(change.playerId);
        if (!inventory) {
          inventory = new PlayerInventory();
          inventory.sessionId = change.playerId;
          this.state.inventories.set(change.playerId, inventory);
        }

        const item = new InventoryItem();
        item.name = change.addItem.name;
        item.description = change.addItem.description;
        item.icon = change.addItem.icon;
        inventory.items.push(item);

        this.transcript?.addStateChange(`${playerName} obtained ${change.addItem.name}`);
      }

      // Remove item
      if (change.removeItem) {
        const inventory = this.state.inventories.get(change.playerId);
        if (inventory) {
          const idx = inventory.items.findIndex(i => i.name === change.removeItem);
          if (idx >= 0) {
            inventory.items.splice(idx, 1);
            this.transcript?.addStateChange(`${playerName} lost ${change.removeItem}`);
          }
        }
      }
    }

    // Broadcast suggested actions
    this.broadcast("suggested-actions", response.suggestedActions);

    this.state.round++;
    this.state.isProcessing = false;

    console.log(`📖 Scene: ${response.scene.title}`);

    // 🔥 AI DETERMINES NEXT TURN - Set based on AI's narrative choice
    this.setNextTurn(response.nextTurn);

    // Log turn change
    this.transcript?.addSystem(`Turn passed to ${response.nextTurn.characterName}: ${response.nextTurn.reason}`);
  }

  // 🔥 AI-DRIVEN TURN SYSTEM

  // Set the next player's turn based on AI's narrative decision
  setNextTurn(nextTurn: { playerId: string; characterName: string; reason: string }) {
    let targetSessionId = nextTurn.playerId;
    let targetName = nextTurn.characterName;

    // 🔥 Robust lookup: Verify player exists, fall back to name search if ID is wrong
    const players = Array.from(this.state.players.values());
    let targetPlayer = this.state.players.get(targetSessionId);

    if (!targetPlayer) {
      console.warn(`⚠️ AI returned unknown playerId '${targetSessionId}', searching by name...`);
      // Try to find by character name or username (case-insensitive)
      targetPlayer = players.find(p =>
        (p.characterName && p.characterName.toLowerCase() === targetName.toLowerCase()) ||
        p.username.toLowerCase() === targetName.toLowerCase()
      );

      if (targetPlayer) {
        targetSessionId = targetPlayer.sessionId;
        targetName = targetPlayer.characterName || targetPlayer.username;
        console.log(`✅ Found player '${targetName}' with ID: ${targetSessionId}`);
      } else {
        // Fallback: If absolutely no match, pick the first player (better than soft-lock)
        if (players.length > 0) {
          targetPlayer = players[0];
          if (targetPlayer) {
            targetSessionId = targetPlayer.sessionId;
            targetName = targetPlayer.characterName || targetPlayer.username;
            console.warn(`🚨 Could not find player '${nextTurn.characterName}', defaulting to ${targetName}`);
          }
        }
      }
    }

    this.state.currentTurn = targetSessionId;
    this.state.currentTurnName = targetName;

    console.log(`🎭 AI chose next turn: ${targetName} (${targetSessionId}) - ${nextTurn.reason}`);

    // Broadcast turn change with narrative reason
    this.broadcast("turn-update", {
      currentTurn: this.state.currentTurn,
      currentTurnName: this.state.currentTurnName,
      message: nextTurn.reason
    });
  }

  override async onAuth(client: Client, options: JoinOptions) {
    // Handle reconnection
    if (options.reconnectionToken) {
      const playerSession = PlayerSessionService.findByReconnectionToken(options.reconnectionToken);
      if (playerSession) {
        console.log("🔄 Player reconnecting with token");
        return { reconnecting: true, playerSession };
      }
    }

    // Generate userId if not provided
    if (!options.userId) {
      options.userId = `user_${client.sessionId}_${Date.now()}`;
    }

    if (!options.username) {
      throw new Error("username is required");
    }

    return true;
  }

  override onJoin(client: Client, options: JoinOptions, auth?: any) {
    console.log(client.sessionId, "joined game!");

    const userId = options.userId || `user_${client.sessionId}_${Date.now()}`;

    // Create or update player in database
    const dbPlayer = PlayerService.createOrUpdate(
      userId,
      options.username,
      options.characterName
    );

    // Check if reconnecting
    const isReconnecting = auth?.reconnecting && auth?.playerSession;

    if (isReconnecting) {
      const oldSessionId = auth.playerSession.session_id;
      const oldPlayer = this.state.players.get(oldSessionId);

      if (oldPlayer) {
        this.state.players.delete(oldSessionId);
        oldPlayer.sessionId = client.sessionId;
        oldPlayer.isConnected = true;
        this.state.players.set(client.sessionId, oldPlayer);

        // Move inventory
        const oldInventory = this.state.inventories.get(oldSessionId);
        if (oldInventory) {
          this.state.inventories.delete(oldSessionId);
          oldInventory.sessionId = client.sessionId;
          this.state.inventories.set(client.sessionId, oldInventory);
        }

        PlayerSessionService.updateStatus(oldSessionId, 'left');
        PlayerSessionService.create(
          this.dbGameSessionId!,
          dbPlayer.id,
          client.sessionId,
          true
        );
        PlayerSessionService.updateHealth(client.sessionId, oldPlayer.health);

        console.log(`🔄 Player ${options.username} reconnected`);
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

    // Normal join
    const player = new Player();
    player.sessionId = client.sessionId;
    player.username = options.username;
    player.characterName = options.characterName || options.username;
    player.userId = userId;
    player.health = 20;
    player.maxHealth = 20;
    player.isConnected = true;

    this.state.players.set(client.sessionId, player);

    // Create empty inventory
    const inventory = new PlayerInventory();
    inventory.sessionId = client.sessionId;
    this.state.inventories.set(client.sessionId, inventory);

    // Create player session in database
    PlayerSessionService.create(
      this.dbGameSessionId!,
      dbPlayer.id,
      client.sessionId,
      true
    );
    PlayerSessionService.updateHealth(client.sessionId, player.health);

    GameEventService.log(this.dbGameSessionId!, 'player_joined', dbPlayer.id, {
      username: options.username,
      characterName: player.characterName,
      health: player.health,
    });

    // Notify others
    this.broadcast("player-joined", {
      sessionId: player.sessionId,
      username: player.username,
      characterName: player.characterName,
    }, { except: client });
  }

  override async onLeave(client: Client, consented?: boolean) {
    console.log(client.sessionId, "left game!", "consented:", consented);

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Allow reconnection
    if (!consented) {
      try {
        const reconnectionToken = `${client.sessionId}_${Date.now()}`;
        PlayerSessionService.setReconnectionToken(client.sessionId, reconnectionToken);

        await this.allowReconnection(client, "manual");

        player.isConnected = false;
        PlayerSessionService.updateStatus(client.sessionId, 'disconnected');

        console.log(`⏸️  Player ${player.username} disconnected - can reconnect anytime`);
        this.broadcast("player-disconnected", {
          sessionId: client.sessionId,
          username: player.username,
        }, { except: client });

        return;
      } catch (e) {
        console.error("Failed to allow reconnection:", e);
      }
    }

    // Player left permanently
    PlayerSessionService.updateStatus(client.sessionId, consented ? 'left' : 'kicked');

    const dbPlayer = PlayerService.getByUserId(player.userId);
    if (dbPlayer) {
      GameEventService.log(this.dbGameSessionId!, 'player_left', dbPlayer.id, {
        username: player.username,
        consented,
      });
    }

    this.state.players.delete(client.sessionId);
    this.state.inventories.delete(client.sessionId);
    console.log(`👋 Player ${player.username} left permanently`);
  }

  override onDispose() {
    console.log("🗑️  GameRoom disposed - all players have left");

    GameEventService.log(this.dbGameSessionId!, 'game_disposed', undefined, {
      finalPlayerCount: this.state.players.size,
      finalRound: this.state.round,
    });

    console.log("🧹 Purging game session data from database...");
    GameSessionService.purgeGameSession(this.roomId);
    GameSessionService.purgeOrphanedPlayers();

    console.log("✅ Game session completely cleaned up");
  }
}
