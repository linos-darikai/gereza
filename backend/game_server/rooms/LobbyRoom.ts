// backend/src/rooms/LobbyRoom.ts
import { Room, type Client } from '@colyseus/core';
import { LobbyState, Player } from '../schemas/LobbyState';

interface JoinOptions {
  userId: string;
  username: string;
  characterName?: string;
  isDM?: boolean;
}

export class LobbyRoom extends Room<LobbyState> {
  override maxClients = 7;

  override onCreate(options: { roomCode?: string; isDM?: boolean }) {
    console.log("🎲 LobbyRoom onCreate called with:", options);

    // Set the roomId to match the invite code or generate one
    this.roomId = options.roomCode || this.generateRoomId();

    this.setState(new LobbyState());
    this.state.roomCode = this.roomId;
    // dmId will be set in onJoin when the DM connects

    console.log("✅ LobbyRoom created with ID:", this.roomId);

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

        // State update is automatic via Schema
      }
    });

    this.onMessage("kick-player", (client, data: { playerId: string }) => {
      if (client.sessionId !== this.state.dmId) return;

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

      this.broadcast("game-starting", {
        message: "Game is starting! Transitioning to game room..."
      });

      console.log("🎮 Game started by DM");
    });
  }

  override onJoin(client: Client, options: JoinOptions) {
    console.log(`👤 ${options.username} joining...`);

    const player = new Player();
    player.sessionId = client.sessionId;
    player.userId = options.userId;
    player.username = options.username;
    player.characterName = options.characterName || "Unnamed Hero";
    player.joinedAt = Date.now();

    if (options.isDM) {
      console.log("🎩 DM joined:", options.username);
      this.state.dmId = client.sessionId;
      player.approved = true;
      player.status = "approved"; // DM is always approved
    } else {
      player.approved = false;
      player.status = "pending";
      console.log(`⏳ Player ${player.username} waiting for approval`);
      client.send("waiting-approval", { message: "Waiting for DM approval..." });
    }

    this.state.players.set(client.sessionId, player);

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

  override onLeave(client: Client, consented?: boolean) {
    console.log(`👋 Client ${client.sessionId} left`);

    const player = this.state.players.get(client.sessionId);

    if (client.sessionId === this.state.dmId) {
      console.log("🎩 DM left (temporarily?)");
      this.broadcast("dm-left", { message: "DM disconnected. Waiting for return..." });
      // IMPORTANT: Room is kept alive for DM refresh/rejoin.
    } else if (player) {
      this.state.players.delete(client.sessionId);
      console.log(`👋 Player ${player.username} left`);
    }
  }

  override onDispose() {
    console.log("🗑️  LobbyRoom disposed");
  }
}