import { getFullGuildConfig, type FullGuildConfig } from "../database/repositories.js";

/**
 * In-memory cache for per-guild settings, sitting in front of the SQLite
 * database. Reads hit the cache first and fall back to the DB (populating
 * the cache on the way); writes should call `invalidate()` (or
 * `set()` directly) right after persisting so the cache never serves
 * stale data.
 */
interface CacheEntry {
  data: FullGuildConfig;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Returns a guild's full config, reading through to the database on a cache miss. */
export function getCachedGuildConfig(guildId: string): FullGuildConfig {
  const hit = cache.get(guildId);
  if (hit) return hit.data;

  const fresh = getFullGuildConfig(guildId);
  cache.set(guildId, { data: fresh, cachedAt: Date.now() });
  return fresh;
}

/** Forces the next read for this guild to hit the database again. Call this after any write. */
export function invalidateGuildCache(guildId: string): void {
  cache.delete(guildId);
}

/** Replaces the cached value directly, skipping a DB round-trip. */
export function setCachedGuildConfig(guildId: string, data: FullGuildConfig): void {
  cache.set(guildId, { data, cachedAt: Date.now() });
}

export function clearSettingsCache(): void {
  cache.clear();
}

export function getCacheStats(): { guildsCached: number } {
  return { guildsCached: cache.size };
}
