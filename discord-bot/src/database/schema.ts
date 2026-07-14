/**
 * All table definitions for the AK ESPORTS persistent store. Every
 * statement is `CREATE TABLE IF NOT EXISTS`, so calling `runMigrations()`
 * (see `db.ts`) is always safe to run on every boot — new installs get
 * the full schema, existing installs are left untouched.
 */
export const SCHEMA_STATEMENTS: string[] = [
  // Global bot configuration — a simple key/value table for
  // process-wide settings that aren't scoped to a single guild.
  `CREATE TABLE IF NOT EXISTS bot_configuration (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  // One row per guild — the general settings bucket (things that don't
  // warrant their own table).
  `CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT,
    locale TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS welcome_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    channel_id TEXT,
    message TEXT,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS goodbye_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    channel_id TEXT,
    message TEXT,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS verification_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    channel_id TEXT,
    role_id TEXT,
    message TEXT,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS ticket_settings (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    category_id TEXT,
    support_role_id TEXT,
    log_channel_id TEXT,
    transcript_channel_id TEXT,
    max_open_tickets INTEGER NOT NULL DEFAULT 0,
    ticket_name_format TEXT NOT NULL DEFAULT 'ticket-{username}',
    updated_at INTEGER NOT NULL
  )`,

  // One row per ticket ever created — kept after close/delete so history,
  // transcripts, and logging always have something to point back to.
  `CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    closed_at INTEGER,
    closed_by TEXT,
    transcript_url TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS log_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    enabled_events TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(message_id, emoji)
  )`,

  `CREATE TABLE IF NOT EXISTS warning_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS user_levels (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    messages INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    prize TEXT NOT NULL,
    winner_count INTEGER NOT NULL DEFAULT 1,
    hosted_by TEXT NOT NULL,
    ends_at INTEGER NOT NULL,
    ended INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  )`,
];
