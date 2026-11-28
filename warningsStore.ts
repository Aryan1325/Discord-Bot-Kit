import { addWarningRecord, clearWarningRecords, listWarningRecords } from "../database/repositories.js";

/**
 * Warning log, keyed by guild + user and persisted in SQLite
 * (`warning_history`) so warnings survive restarts and stay isolated per
 * server. Function signatures are unchanged from the old in-memory version.
 */
export interface Warning {
  id: number;
  moderatorId: string;
  reason: string;
  createdAt: number;
}

export function addWarning(guildId: string, userId: string, moderatorId: string, reason: string): Warning {
  const record = addWarningRecord({ guildId, userId, moderatorId, reason });
  return { id: record.id, moderatorId: record.moderatorId, reason: record.reason, createdAt: record.createdAt };
}

/** Oldest first (callers show the most recent with `.slice(-n)`). */
export function getWarnings(guildId: string, userId: string): Warning[] {
  return listWarningRecords(guildId, userId)
    .map((r) => ({ id: r.id, moderatorId: r.moderatorId, reason: r.reason, createdAt: r.createdAt }))
    .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
}

/** Clears all warnings for a user, returning how many were removed. */
export function clearWarnings(guildId: string, userId: string): number {
  return clearWarningRecords(guildId, userId);
}
