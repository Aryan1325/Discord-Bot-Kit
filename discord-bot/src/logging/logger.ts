import type { Client } from "discord.js";
import { createEmbed } from "../embeds/embedBuilder.js";
import { getLogSettings, upsertLogSettings } from "../database/repositories.js";
import { invalidateGuildCache } from "../cache/settingsCache.js";
import { logError } from "../errors/errorHandler.js";
import { LOG_EVENT_LABELS, LogEventType, type LogPayload } from "./types.js";

/**
 * Modular logging dispatcher. Call `dispatchLog(client, guildId, eventType,
 * payload)` from any future event handler (message delete, member join,
 * etc.) and it will:
 *   1. Look up the guild's log settings (channel + which events are on).
 *   2. No-op silently if logging isn't configured or that event is disabled.
 *   3. Otherwise post a branded embed to the configured channel.
 *
 * No event listeners call this yet — per spec, only the framework is being
 * built in this pass. Wiring `dispatchLog()` into the eight event types is
 * future work once each event's data shape is decided.
 */
export async function dispatchLog(client: Client, guildId: string, eventType: LogEventType, payload: LogPayload): Promise<void> {
  try {
    const settings = getLogSettings(guildId);
    if (!settings?.channelId || !settings.enabledEvents.includes(eventType)) {
      return;
    }

    const channel = await client.channels.fetch(settings.channelId).catch(() => null);
    if (!channel || !("send" in channel) || typeof channel.send !== "function") {
      return;
    }

    const embed = createEmbed({
      client,
      title: `📊 ${LOG_EVENT_LABELS[eventType]}`,
      description: payload.description,
      fields: payload.fields,
    });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    logError(`LOGGING:${eventType}`, error);
  }
}

/** Enables or disables a single log event type for a guild, keeping the settings cache in sync. */
export function setLogEventEnabled(guildId: string, eventType: LogEventType, enabled: boolean): void {
  const current = getLogSettings(guildId);
  const events = new Set(current?.enabledEvents ?? []);

  if (enabled) {
    events.add(eventType);
  } else {
    events.delete(eventType);
  }

  upsertLogSettings(guildId, { enabledEvents: Array.from(events) });
  invalidateGuildCache(guildId);
}

export { LogEventType, LOG_EVENT_LABELS } from "./types.js";
export type { LogPayload } from "./types.js";
