// frontend/src/schemas/GameState.ts
// Client-side schema definitions mirroring backend GameState
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

export class InventoryItem extends Schema {
  @type("string") name: string = "";
  @type("string") description: string = "";
  @type("string") icon: string = "📦";
}

export class ChatMessage extends Schema {
  @type("string") id: string = "";
  @type("string") role: string = "";
  @type("string") playerSessionId: string = "";
  @type("string") playerUsername: string = "";
  @type("string") content: string = "";
  @type("string") sceneTitle: string = "";
  @type("string") sceneDescription: string = "";
  @type("string") sceneMood: string = "";
  @type("string") sceneImageUrl: string = "";
  @type("number") timestamp: number = 0;
}

export class PlayerInventory extends Schema {
  @type("string") sessionId: string = "";
  @type([InventoryItem]) items = new ArraySchema<InventoryItem>();
}

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") userId: string = "";
  @type("string") username: string = "";
  @type("string") characterName: string = "";
  @type("number") health: number = 20;
  @type("number") maxHealth: number = 20;
  @type("string") status: string = "";
  @type("boolean") isConnected: boolean = true;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") roomCode: string = "";
  @type("string") dmSessionId: string = "";
  @type("string") status: string = "waiting";
  @type("number") round: number = 0;
  @type("string") currentTurn: string = ""; // sessionId of whose turn
  @type("string") currentTurnName: string = ""; // display name
  @type("string") currentSceneTitle: string = "";
  @type("string") currentSceneDescription: string = "";
  @type("string") currentSceneMood: string = "mysterious";
  @type("string") currentSceneImageUrl: string = "";
  @type([ChatMessage]) chatHistory = new ArraySchema<ChatMessage>();
  @type({ map: PlayerInventory }) inventories = new MapSchema<PlayerInventory>();
  @type("boolean") isProcessing: boolean = false;
}
