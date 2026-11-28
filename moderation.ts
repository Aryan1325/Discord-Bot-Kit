import type { ChatInputCommandInteraction, User } from "discord.js";
import { dispatchLog } from "./logger.js";
import { LogEventType } from "./types.js";

/** Posts a moderation action to the server's configured log channel (if enabled). Never throws. */
export async function logModeration(
  interaction: ChatInputCommandInteraction,
  action: string,
  target: User | { id: string; tag?: string },
  reason: string,
): Promise<void> {
  if (!interaction.guildId) return;
  await dispatchLog(interaction.client, interaction.guildId, LogEventType.ModerationAction, {
    description: `**${action}** — <@${target.id}> by <@${interaction.user.id}>`,
    fields: [{ name: "Reason", value: reason.slice(0, 1000) }],
  }).catch(() => undefined);
}
