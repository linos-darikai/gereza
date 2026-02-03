// backend/src/schemas/GameState.ts
import { Schema, type, MapSchema } from '@colyseus/schema';

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") userId: string = "";
  @type("string") username: string = "";
  @type("number") health: number = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") currentTurn: string = "";
  @type("number") round: number = 0;
  @type("string") status: string = "waiting"; // waiting, playing, finished
}
