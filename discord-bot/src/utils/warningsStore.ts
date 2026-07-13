/**
 * In-memory warning log, keyed by guild + user. Resets when the bot
 * restarts — if warnings need to survive restarts, back this with a
 * database instead of a Map.
 */
export interface Warning {
  id: number;
  moderatorId: string;
  reason: string;
  createdAt: number;
}

const warningsByKey = new Map<string, Warning[]>();
let nextWarningId = 1;

function keyFor(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function addWarning(guildId: string, userId: string, moderatorId: string, reason: string): Warning {
  const warning: Warning = { id: nextWarningId++, moderatorId, reason, createdAt: Date.now() };
  const list = warningsByKey.get(keyFor(guildId, userId)) ?? [];
  list.push(warning);
  warningsByKey.set(keyFor(guildId, userId), list);
  return warning;
}

export function getWarnings(guildId: string, userId: string): Warning[] {
  return warningsByKey.get(keyFor(guildId, userId)) ?? [];
}

/** Clears all warnings for a user, returning how many were removed. */
export function clearWarnings(guildId: string, userId: string): number {
  const list = warningsByKey.get(keyFor(guildId, userId)) ?? [];
  warningsByKey.delete(keyFor(guildId, userId));
  return list.length;
}
