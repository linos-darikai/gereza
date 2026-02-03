// backend/src/rooms/GameRoom.ts
import { Room, type Client } from '@colyseus/core';
import { GameState, Player } from '../schemas/GameState';

export class GameRoom extends Room<{ state: GameState }> {
    override maxClients = 6;

    override onCreate(options: any) {
        console.log("🎮 GameRoom created!", options);
        this.setState(new GameState());

        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {

                console.log(`Player ${player.username} moved to ${player.health}, ${data.y}ß`);
            }
        });

        this.onMessage("action", (client, data) => {
            // Handle comprehensive game actions here
            console.log(`Action received from ${client.sessionId}:`, data);
        });
    }

    override onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        const player = new Player();
        player.sessionId = client.sessionId;
        player.username = options.username || "Guest";
        player.userId = options.userId || "unknown";

        player.health = Math.floor(Math.random() * 100); // random  health is crazy

        this.state.players.set(client.sessionId, player);
    }

    override onLeave(client: Client, _code?: number) {
        console.log(client.sessionId, "left!");
        this.state.players.delete(client.sessionId);
    }

    override onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
