// backend/game_server/database/db.ts
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const DB_PATH = process.env.DB_PATH || join(import.meta.dir, "game_server.db");

// Initialize database
export const db = new Database(DB_PATH, { create: true });

// Enable foreign keys and WAL mode for better performance
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

// Initialize schema
const schemaPath = join(import.meta.dir, "schema.sql");
const schema = readFileSync(schemaPath, "utf-8");
db.exec(schema);

console.log("✅ Database initialized at:", DB_PATH);

// Helper function to convert rows to objects with proper types
export function rowToObject<T>(row: any): T {
  return row as T;
}

export default db;
