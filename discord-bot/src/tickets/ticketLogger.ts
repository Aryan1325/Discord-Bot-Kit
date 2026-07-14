import type { Client } from "discord.js";
import { createEmbed } from "../embeds/embedBuilder.js";
import { getTicketSettings } from "../database/repositories.js";
import { logError } from "../errors/errorHandler.js";
import { LOG_EVENT_LABELS, LogEventType, type LogPayload } from "../logging/types.js";

/**
 * Ticket-specific logging. Posts to the `log_channel` configured via
 * `/ticket setup` (distinct from the general `/config` logging channel),
 * matching the setup command's dedicated `log_channel` option.
 */
export async function dispatchTicketLog(client: Client, guildId: string, eventType: LogEventType, payload: LogPayload): Promise<void> {
  try {
    const settings = getTicketSettings(guildId);
    if (!settings?.logChannelId) return;

    const channel = await client.channels.fetch(settings.logChannelId).catch(() => null);
    if (!channel || !("send" in channel) || typeof channel.send !== "function") return;

    const embed = createEmbed({
      client,
      title: `🎫 ${LOG_EVENT_LABELS[eventType]}`,
      description: payload.description,
      fields: payload.fields,
    });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    logError(`TICKET_LOGGING:${eventType}`, error);
  }
}
