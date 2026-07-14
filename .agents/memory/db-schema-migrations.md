---
name: Discord bot DB schema migration pattern
description: How new columns are added to existing SQLite tables without a migration framework.
---

The discord-bot has no migration framework. New columns on existing tables (e.g. `ticket_settings`, `welcome_settings`, `goodbye_settings`) are added via a `columnMigrations` array of `ALTER TABLE ... ADD COLUMN` statements run on every boot, each wrapped in try/catch that ignores "duplicate column" errors. `schema.ts`'s `CREATE TABLE IF NOT EXISTS` statements are also updated to include the new columns so fresh installs get them immediately.

**Why:** keeps schema changes idempotent and safe to re-run every startup without tracking migration version state.

**How to apply:** when adding a column to any existing table, add it to both the `CREATE TABLE` statement in `schema.ts` (for new installs) and the `columnMigrations` array in `db.ts` (for existing installs).
