// backend/src/schemas/LobbyState.ts
import { Schema, type, MapSchema } from '@colyseus/schema';

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") userId: string = "";
  @type("string") username: string = "";
  @type("string") characterName: string = "";
  @type("string") status: string = "pending";
  @type("number") joinedAt: number = Date.now();
}

export class LobbyState extends Schema {
  @type("string") roomCode: string = "";
  @type("string") dmId: string = "";
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") maxPlayers: number = 6;
  @type("boolean") gameStarted: boolean = false;
}