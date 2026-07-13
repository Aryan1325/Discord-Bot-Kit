import { getDb } from "./db.js";

/**
 * Typed query helpers for every table in `schema.ts`, grouped by domain.
 * Every guild-scoped table follows the same shape: a `guild_id` primary
 * (or foreign) key and simple get/upsert helpers. This file is the only
 * place that should touch `getDb()` directly — commands and events
 * should always go through these functions.
 */

function now(): number {
  return Date.now();
}

// ---------------------------------------------------------------------
// Guild Settings
// ---------------------------------------------------------------------
export interface GuildSettings {
  guildId: string;
  prefix: string | null;
  locale: string | null;
  createdAt: number;
  updatedAt: number;
}

export function getGuildSettings(guildId: string): GuildSettings | null {
  const row = getDb()
    .prepare("SELECT guild_id as guildId, prefix, locale, created_at as createdAt, updated_at as updatedAt FROM guild_settings WHERE guild_id = ?")
    .get(guildId) as GuildSettings | undefined;
  return row ?? null;
}

export function ensureGuildSettings(guildId: string): GuildSettings {
  const existing = getGuildSettings(guildId);
  if (existing) return existing;

  const timestamp = now();
  getDb()
    .prepare("INSERT INTO guild_settings (guild_id, prefix, locale, created_at, updated_at) VALUES (?, NULL, NULL, ?, ?)")
    .run(guildId, timestamp, timestamp);

  return { guildId, prefix: null, locale: null, createdAt: timestamp, updatedAt: timestamp };
}

// ---------------------------------------------------------------------
// Welcome / Goodbye Settings
// ---------------------------------------------------------------------
export interface WelcomeGoodbyeSettings {
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  message: string | null;
  updatedAt: number;
}

function getMessageSettings(table: "welcome_settings" | "goodbye_settings", guildId: string): WelcomeGoodbyeSettings | null {
  const row = getDb()
    .prepare(`SELECT guild_id as guildId, enabled, channel_id as channelId, message, updated_at as updatedAt FROM ${table} WHERE guild_id = ?`)
    .get(guildId) as (Omit<WelcomeGoodbyeSettings, "enabled"> & { enabled: number }) | undefined;
  if (!row) return null;
  return { ...row, enabled: Boolean(row.enabled) };
}

function upsertMessageSettings(
  table: "welcome_settings" | "goodbye_settings",
  guildId: string,
  patch: Partial<Pick<WelcomeGoodbyeSettings, "enabled" | "channelId" | "message">>,
): WelcomeGoodbyeSettings {
  const current = getMessageSettings(table, guildId) ?? { guildId, enabled: false, channelId: null, message: null, updatedAt: 0 };
  const merged = { ...current, ...patch, updatedAt: now() };

  getDb()
    .prepare(
      `INSERT INTO ${table} (guild_id, enabled, channel_id, message, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET enabled = excluded.enabled, channel_id = excluded.channel_id, message = excluded.message, updated_at = excluded.updated_at`,
    )
    .run(guildId, merged.enabled ? 1 : 0, merged.channelId, merged.message, merged.updatedAt);

  return merged;
}

export const getWelcomeSettings = (guildId: string) => getMessageSettings("welcome_settings", guildId);
export const upsertWelcomeSettings = (guildId: string, patch: Partial<Pick<WelcomeGoodbyeSettings, "enabled" | "channelId" | "message">>) =>
  upsertMessageSettings("welcome_settings", guildId, patch);

export const getGoodbyeSettings = (guildId: string) => getMessageSettings("goodbye_settings", guildId);
export const upsertGoodbyeSettings = (guildId: string, patch: Partial<Pick<WelcomeGoodbyeSettings, "enabled" | "channelId" | "message">>) =>
  upsertMessageSettings("goodbye_settings", guildId, patch);

// ---------------------------------------------------------------------
// Verification Settings
// ---------------------------------------------------------------------
export interface VerificationSettings {
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  roleId: string | null;
  message: string | null;
  updatedAt: number;
}

export function getVerificationSettings(guildId: string): VerificationSettings | null {
  const row = getDb()
    .prepare(
      "SELECT guild_id as guildId, enabled, channel_id as channelId, role_id as roleId, message, updated_at as updatedAt FROM verification_settings WHERE guild_id = ?",
    )
    .get(guildId) as (Omit<VerificationSettings, "enabled"> & { enabled: number }) | undefined;
  if (!row) return null;
  return { ...row, enabled: Boolean(row.enabled) };
}

export function upsertVerificationSettings(
  guildId: string,
  patch: Partial<Pick<VerificationSettings, "enabled" | "channelId" | "roleId" | "message">>,
): VerificationSettings {
  const current = getVerificationSettings(guildId) ?? {
    guildId,
    enabled: false,
    channelId: null,
    roleId: null,
    message: null,
    updatedAt: 0,
  };
  const merged = { ...current, ...patch, updatedAt: now() };

  getDb()
    .prepare(
      `INSERT INTO verification_settings (guild_id, enabled, channel_id, role_id, message, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET enabled = excluded.enabled, channel_id = excluded.channel_id, role_id = excluded.role_id, message = excluded.message, updated_at = excluded.updated_at`,
    )
    .run(guildId, merged.enabled ? 1 : 0, merged.channelId, merged.roleId, merged.message, merged.updatedAt);

  return merged;
}

// ---------------------------------------------------------------------
// Ticket Settings
// ---------------------------------------------------------------------
export interface TicketSettings {
  guildId: string;
  enabled: boolean;
  categoryId: string | null;
  supportRoleId: string | null;
  logChannelId: string | null;
  updatedAt: number;
}

export function getTicketSettings(guildId: string): TicketSettings | null {
  const row = getDb()
    .prepare(
      "SELECT guild_id as guildId, enabled, category_id as categoryId, support_role_id as supportRoleId, log_channel_id as logChannelId, updated_at as updatedAt FROM ticket_settings WHERE guild_id = ?",
    )
    .get(guildId) as (Omit<TicketSettings, "enabled"> & { enabled: number }) | undefined;
  if (!row) return null;
  return { ...row, enabled: Boolean(row.enabled) };
}

export function upsertTicketSettings(
  guildId: string,
  patch: Partial<Pick<TicketSettings, "enabled" | "categoryId" | "supportRoleId" | "logChannelId">>,
): TicketSettings {
  const current = getTicketSettings(guildId) ?? {
    guildId,
    enabled: false,
    categoryId: null,
    supportRoleId: null,
    logChannelId: null,
    updatedAt: 0,
  };
  const merged = { ...current, ...patch, updatedAt: now() };

  getDb()
    .prepare(
      `INSERT INTO ticket_settings (guild_id, enabled, category_id, support_role_id, log_channel_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET enabled = excluded.enabled, category_id = excluded.category_id, support_role_id = excluded.support_role_id, log_channel_id = excluded.log_channel_id, updated_at = excluded.updated_at`,
    )
    .run(guildId, merged.enabled ? 1 : 0, merged.categoryId, merged.supportRoleId, merged.logChannelId, merged.updatedAt);

  return merged;
}

// ---------------------------------------------------------------------
// Log Settings (framework only — see src/logging)
// ---------------------------------------------------------------------
export interface LogSettings {
  guildId: string;
  channelId: string | null;
  enabledEvents: string[];
  updatedAt: number;
}

export function getLogSettings(guildId: string): LogSettings | null {
  const row = getDb()
    .prepare("SELECT guild_id as guildId, channel_id as channelId, enabled_events as enabledEvents, updated_at as updatedAt FROM log_settings WHERE guild_id = ?")
    .get(guildId) as (Omit<LogSettings, "enabledEvents"> & { enabledEvents: string }) | undefined;
  if (!row) return null;

  let enabledEvents: string[] = [];
  try {
    enabledEvents = JSON.parse(row.enabledEvents);
  } catch {
    enabledEvents = [];
  }

  return { ...row, enabledEvents };
}

export function upsertLogSettings(guildId: string, patch: Partial<Pick<LogSettings, "channelId" | "enabledEvents">>): LogSettings {
  const current = getLogSettings(guildId) ?? { guildId, channelId: null, enabledEvents: [], updatedAt: 0 };
  const merged = { ...current, ...patch, updatedAt: now() };

  getDb()
    .prepare(
      `INSERT INTO log_settings (guild_id, channel_id, enabled_events, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id, enabled_events = excluded.enabled_events, updated_at = excluded.updated_at`,
    )
    .run(guildId, merged.channelId, JSON.stringify(merged.enabledEvents), merged.updatedAt);

  return merged;
}

// ---------------------------------------------------------------------
// Reaction Roles
// ---------------------------------------------------------------------
export interface ReactionRole {
  id: number;
  guildId: string;
  messageId: string;
  channelId: string;
  emoji: string;
  roleId: string;
  createdAt: number;
}

export function listReactionRoles(guildId: string): ReactionRole[] {
  return getDb()
    .prepare(
      "SELECT id, guild_id as guildId, message_id as messageId, channel_id as channelId, emoji, role_id as roleId, created_at as createdAt FROM reaction_roles WHERE guild_id = ?",
    )
    .all(guildId) as unknown as ReactionRole[];
}

export function addReactionRole(input: Omit<ReactionRole, "id" | "createdAt">): void {
  getDb()
    .prepare(
      "INSERT INTO reaction_roles (guild_id, message_id, channel_id, emoji, role_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(input.guildId, input.messageId, input.channelId, input.emoji, input.roleId, now());
}

export function removeReactionRole(messageId: string, emoji: string): void {
  getDb().prepare("DELETE FROM reaction_roles WHERE message_id = ? AND emoji = ?").run(messageId, emoji);
}

// ---------------------------------------------------------------------
// Warning History
// ---------------------------------------------------------------------
export interface WarningRecord {
  id: number;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: number;
}

export function addWarningRecord(input: Omit<WarningRecord, "id" | "createdAt">): WarningRecord {
  const timestamp = now();
  const result = getDb()
    .prepare("INSERT INTO warning_history (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(input.guildId, input.userId, input.moderatorId, input.reason, timestamp);

  return { id: Number(result.lastInsertRowid), createdAt: timestamp, ...input };
}

export function listWarningRecords(guildId: string, userId: string): WarningRecord[] {
  return getDb()
    .prepare(
      "SELECT id, guild_id as guildId, user_id as userId, moderator_id as moderatorId, reason, created_at as createdAt FROM warning_history WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC",
    )
    .all(guildId, userId) as unknown as WarningRecord[];
}

export function clearWarningRecords(guildId: string, userId: string): number {
  const result = getDb().prepare("DELETE FROM warning_history WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
  return Number(result.changes);
}

// ---------------------------------------------------------------------
// User Levels
// ---------------------------------------------------------------------
export interface UserLevel {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  messages: number;
  updatedAt: number;
}

export function getUserLevel(guildId: string, userId: string): UserLevel | null {
  const row = getDb()
    .prepare("SELECT guild_id as guildId, user_id as userId, xp, level, messages, updated_at as updatedAt FROM user_levels WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as UserLevel | undefined;
  return row ?? null;
}

export function upsertUserLevel(guildId: string, userId: string, patch: Partial<Pick<UserLevel, "xp" | "level" | "messages">>): UserLevel {
  const current = getUserLevel(guildId, userId) ?? { guildId, userId, xp: 0, level: 0, messages: 0, updatedAt: 0 };
  const merged = { ...current, ...patch, updatedAt: now() };

  getDb()
    .prepare(
      `INSERT INTO user_levels (guild_id, user_id, xp, level, messages, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = excluded.xp, level = excluded.level, messages = excluded.messages, updated_at = excluded.updated_at`,
    )
    .run(merged.guildId, merged.userId, merged.xp, merged.level, merged.messages, merged.updatedAt);

  return merged;
}

// ---------------------------------------------------------------------
// Giveaways
// ---------------------------------------------------------------------
export interface Giveaway {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  prize: string;
  winnerCount: number;
  hostedBy: string;
  endsAt: number;
  ended: boolean;
  createdAt: number;
}

export function createGiveaway(input: Omit<Giveaway, "id" | "ended" | "createdAt">): Giveaway {
  const timestamp = now();
  const result = getDb()
    .prepare(
      "INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winner_count, hosted_by, ends_at, ended, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)",
    )
    .run(input.guildId, input.channelId, input.messageId, input.prize, input.winnerCount, input.hostedBy, input.endsAt, timestamp);

  return { id: Number(result.lastInsertRowid), ended: false, createdAt: timestamp, ...input };
}

export function listActiveGiveaways(guildId: string): Giveaway[] {
  const rows = getDb()
    .prepare(
      "SELECT id, guild_id as guildId, channel_id as channelId, message_id as messageId, prize, winner_count as winnerCount, hosted_by as hostedBy, ends_at as endsAt, ended, created_at as createdAt FROM giveaways WHERE guild_id = ? AND ended = 0",
    )
    .all(guildId) as (Omit<Giveaway, "ended"> & { ended: number })[];
  return rows.map((row) => ({ ...row, ended: Boolean(row.ended) }));
}

export function endGiveaway(id: number): void {
  getDb().prepare("UPDATE giveaways SET ended = 1 WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------
export interface Suggestion {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  userId: string;
  content: string;
  status: string;
  createdAt: number;
}

export function createSuggestion(input: Omit<Suggestion, "id" | "status" | "createdAt">): Suggestion {
  const timestamp = now();
  const result = getDb()
    .prepare("INSERT INTO suggestions (guild_id, channel_id, message_id, user_id, content, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)")
    .run(input.guildId, input.channelId, input.messageId, input.userId, input.content, timestamp);

  return { id: Number(result.lastInsertRowid), status: "pending", createdAt: timestamp, ...input };
}

export function listSuggestions(guildId: string): Suggestion[] {
  return getDb()
    .prepare(
      "SELECT id, guild_id as guildId, channel_id as channelId, message_id as messageId, user_id as userId, content, status, created_at as createdAt FROM suggestions WHERE guild_id = ? ORDER BY created_at DESC",
    )
    .all(guildId) as unknown as Suggestion[];
}

export function updateSuggestionStatus(id: number, status: string): void {
  getDb().prepare("UPDATE suggestions SET status = ? WHERE id = ?").run(status, id);
}

// ---------------------------------------------------------------------
// Bot Configuration (global key/value store)
// ---------------------------------------------------------------------
export function getConfigValue(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM bot_configuration WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfigValue(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO bot_configuration (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, now());
}

// ---------------------------------------------------------------------
// Aggregate guild config (used by /config view, export, import, reset)
// ---------------------------------------------------------------------
export interface FullGuildConfig {
  guildSettings: Omit<GuildSettings, "guildId"> | null;
  welcome: Omit<WelcomeGoodbyeSettings, "guildId"> | null;
  goodbye: Omit<WelcomeGoodbyeSettings, "guildId"> | null;
  verification: Omit<VerificationSettings, "guildId"> | null;
  tickets: Omit<TicketSettings, "guildId"> | null;
  logging: Omit<LogSettings, "guildId"> | null;
}

export function getFullGuildConfig(guildId: string): FullGuildConfig {
  const strip = <T extends { guildId: string }>(row: T | null): Omit<T, "guildId"> | null => {
    if (!row) return null;
    const { guildId: _guildId, ...rest } = row;
    return rest;
  };

  return {
    guildSettings: strip(getGuildSettings(guildId)),
    welcome: strip(getWelcomeSettings(guildId)),
    goodbye: strip(getGoodbyeSettings(guildId)),
    verification: strip(getVerificationSettings(guildId)),
    tickets: strip(getTicketSettings(guildId)),
    logging: strip(getLogSettings(guildId)),
  };
}

const GUILD_SCOPED_TABLES = [
  "guild_settings",
  "welcome_settings",
  "goodbye_settings",
  "verification_settings",
  "ticket_settings",
  "log_settings",
  "reaction_roles",
  "warning_history",
  "user_levels",
  "giveaways",
  "suggestions",
] as const;

/** Deletes every row for this guild across all guild-scoped tables. */
export function resetGuildConfig(guildId: string): void {
  const db = getDb();
  for (const table of GUILD_SCOPED_TABLES) {
    db.prepare(`DELETE FROM ${table} WHERE guild_id = ?`).run(guildId);
  }
}

/**
 * Imports a previously exported config object. Unknown/malformed
 * sections are skipped rather than throwing, so a partially-edited
 * export file can still be imported safely.
 */
export function importGuildConfig(guildId: string, data: Partial<FullGuildConfig>): void {
  ensureGuildSettings(guildId);

  if (data.welcome && typeof data.welcome === "object") {
    upsertWelcomeSettings(guildId, {
      enabled: Boolean(data.welcome.enabled),
      channelId: data.welcome.channelId ?? null,
      message: data.welcome.message ?? null,
    });
  }
  if (data.goodbye && typeof data.goodbye === "object") {
    upsertGoodbyeSettings(guildId, {
      enabled: Boolean(data.goodbye.enabled),
      channelId: data.goodbye.channelId ?? null,
      message: data.goodbye.message ?? null,
    });
  }
  if (data.verification && typeof data.verification === "object") {
    upsertVerificationSettings(guildId, {
      enabled: Boolean(data.verification.enabled),
      channelId: data.verification.channelId ?? null,
      roleId: data.verification.roleId ?? null,
      message: data.verification.message ?? null,
    });
  }
  if (data.tickets && typeof data.tickets === "object") {
    upsertTicketSettings(guildId, {
      enabled: Boolean(data.tickets.enabled),
      categoryId: data.tickets.categoryId ?? null,
      supportRoleId: data.tickets.supportRoleId ?? null,
      logChannelId: data.tickets.logChannelId ?? null,
    });
  }
  if (data.logging && typeof data.logging === "object") {
    upsertLogSettings(guildId, {
      channelId: data.logging.channelId ?? null,
      enabledEvents: Array.isArray(data.logging.enabledEvents) ? data.logging.enabledEvents : [],
    });
  }
}
