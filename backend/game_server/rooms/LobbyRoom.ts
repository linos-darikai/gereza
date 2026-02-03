// backend/src/rooms/LobbyRoom.ts
import { Room, type Client } from '@colyseus/core';
import { LobbyState, Player } from '../schemas/LobbyState';

interface JoinOptions {
  userId: string;
  username: string;
  characterName?: string;
  isDM?: boolean;
}

export class LobbyRoom extends Room<{ state: LobbyState }> {
  override maxClients = 7;

  override onCreate(options: { roomCode: string; dmId: string }) {
    console.log("🎲 LobbyRoom onCreate called with:", options);

    // Set the roomId to match the invite code
    // This MUST be done before setState
    this.roomId = options.roomCode;

    // Initialize state
    this.setState(new LobbyState());
    this.state.roomCode = options.roomCode;
    this.state.dmId = options.dmId;

    console.log("✅ LobbyRoom created with ID:", this.roomId);

    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    this.onMessage("approve-player", (client, data: { playerId: string; approved: boolean }) => {
      if (client.sessionId !== this.state.dmId) {
        console.log("⚠️  Non-DM tried to approve player");
        return;
      }

      const player = this.state.players.get(data.playerId);
      if (player) {
        player.status = data.approved ? "approved" : "rejected";
        console.log(`${data.approved ? '✅' : '❌'} Player ${player.username} ${player.status}`);

        this.clients.forEach(c => {
          if (c.sessionId === data.playerId) {
            c.send("status-changed", { status: player.status });
          }
        });
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
        if (p.status === "approved") approvedPlayers.push(p);
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

    if (options.isDM) {
      console.log("🎩 DM joined:", options.username);

      client.send("joined-as-dm", {
        roomCode: this.state.roomCode,
        players: Array.from(this.state.players.values())
      });
    } else {
      const player = new Player();
      player.sessionId = client.sessionId;
      player.userId = options.userId;
      player.username = options.username;
      player.characterName = options.characterName || "Unnamed Hero";
      player.status = "pending";
      player.joinedAt = Date.now();

      this.state.players.set(client.sessionId, player);

      console.log(`⏳ Player ${player.username} waiting for approval`);

      client.send("waiting-approval", {
        message: "Waiting for DM approval..."
      });

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

  override onLeave(client: Client, _code?: number) {
    console.log(`👋 Client ${client.sessionId} left`);

    const player = this.state.players.get(client.sessionId);

    if (client.sessionId === this.state.dmId) {
      console.log("🎩 DM left, closing room");
      this.broadcast("dm-left", { message: "DM has left the session" });
      this.disconnect();
    } else if (player) {
      this.state.players.delete(client.sessionId);
      console.log(`👋 Player ${player.username} left`);
    }
  }

  override onDispose() {
    console.log("🗑️  LobbyRoom disposed");
  }
}