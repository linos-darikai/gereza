// backend/src/schemas/GameState.ts
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

// Inventory item schema
export class InventoryItem extends Schema {
  @type("string") name: string = "";
  @type("string") description: string = "";
  @type("string") icon: string = "📦";
}

// Chat message schema for game history
export class ChatMessage extends Schema {
  @type("string") id: string = "";
  @type("string") role: string = ""; // "user", "assistant", "system"
  @type("string") playerSessionId: string = ""; // who sent it (if user)
  @type("string") playerUsername: string = "";
  @type("string") content: string = ""; // text content for user messages
  @type("string") sceneTitle: string = ""; // for AI scene responses
  @type("string") sceneDescription: string = "";
  @type("string") sceneMood: string = "";
  @type("string") sceneImageUrl: string = "";
  @type("number") timestamp: number = 0;
}

// Per-player inventory
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
  @type("string") status: string = ""; // status effects
  @type("boolean") isConnected: boolean = true;
}

export class GameState extends Schema {
  // Players
  @type({ map: Player }) players = new MapSchema<Player>();

  // Game metadata
  @type("string") roomCode: string = "";
  @type("string") dmSessionId: string = ""; // room creator
  @type("string") status: string = "waiting"; // waiting, playing, finished
  @type("number") round: number = 0;

  // 🔥 Turn tracking
  @type("string") currentTurn: string = ""; // sessionId of whose turn it is
  @type("string") currentTurnName: string = ""; // display name (characterName)

  // Current scene (shared by all)
  @type("string") currentSceneTitle: string = "";
  @type("string") currentSceneDescription: string = "";
  @type("string") currentSceneMood: string = "mysterious";
  @type("string") currentSceneImageUrl: string = "";

  // Chat/action history
  @type([ChatMessage]) chatHistory = new ArraySchema<ChatMessage>();

  // Per-player inventories
  @type({ map: PlayerInventory }) inventories = new MapSchema<PlayerInventory>();

  // AI processing flag
  @type("boolean") isProcessing: boolean = false;
}
