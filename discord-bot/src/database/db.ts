import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_STATEMENTS } from "./schema.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
// `src/database` -> package root -> `data/bot.db`. Works both under `tsx`
// (running from `src/`) and the bundled `dist/index.mjs` (running from
// `dist/`), since in both cases going up one directory lands on the
// package root.
const dataDir = path.resolve(moduleDir, "..", "..", "data");
const dbPath = path.join(dataDir, "bot.db");

let db: DatabaseSync | null = null;
let ready = false;
let initError: unknown = null;

/**
 * Lazily opens the SQLite database and runs all `CREATE TABLE IF NOT
 * EXISTS` migrations. Safe to call repeatedly — after the first call the
 * existing connection is reused.
 */
export function getDb(): DatabaseSync {
  if (db) return db;

  try {
    mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");

    for (const statement of SCHEMA_STATEMENTS) {
      db.exec(statement);
    }

    ready = true;
    console.log(`[DATABASE] Connected and migrated: ${dbPath}`);
    return db;
  } catch (error) {
    initError = error;
    console.error("[DATABASE] Failed to initialize SQLite database:", error);
    throw error;
  }
}

/** Returns basic health info for `/botinfo`-style reporting and startup logs. */
export function getDatabaseStatus(): { ready: boolean; path: string; error: string | null } {
  return {
    ready,
    path: dbPath,
    error: initError instanceof Error ? initError.message : initError ? String(initError) : null,
  };
}
