import { Events, MessageFlags, type ChatInputCommandInteraction, type Interaction } from "discord.js";
import type { BotEvent } from "../types/index.js";
import { loadCommands } from "../handlers/commandHandler.js";
import { handleInteractionError, logError } from "../errors/errorHandler.js";
import { handleTicketButton, handleTicketModal } from "../tickets/interactionHandlers.js";
import { handleVerifyButton, VERIFY_BUTTON_ID } from "../verification/service.js";

/**
 * Safety net for "The application did not respond". Discord requires an
 * acknowledgement within 3 seconds. If a command is still working at 2.5s
 * (slow API call, rate limit, cold start) we defer it ourselves; from then
 * on a plain `interaction.reply()` from the command is transparently turned
 * into `editReply()` so the command's own response still arrives.
 */
const ACK_DEADLINE_MS = 2500;

export async function runWithAckGuard(interaction: ChatInputCommandInteraction, run: () => Promise<void>): Promise<void> {
  let guardDeferred = false;
  const originalReply = interaction.reply.bind(interaction);
  (interaction as { reply: unknown }).reply = (options: never) =>
    guardDeferred && !interaction.replied ? interaction.editReply(options) : originalReply(options);

  const timer = setTimeout(() => {
    if (interaction.replied || interaction.deferred) return;
    interaction
      .deferReply({ flags: MessageFlags.Ephemeral })
      .then(() => {
        guardDeferred = true;
      })
      .catch((error) => logError("ACK_GUARD", error));
  }, ACK_DEADLINE_MS);

  try {
    await run();
  } finally {
    clearTimeout(timer);
  }
}

export const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(_client, ...args) {
    const interaction = args[0] as Interaction;

    try {
      if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
        try {
          await handleVerifyButton(interaction);
        } catch (error) {
          logError("VERIFY_BUTTON", error);
          const message = { content: "❌ Something went wrong while verifying you. Please try again or tell a moderator.", flags: MessageFlags.Ephemeral } as const;
          if (interaction.deferred || interaction.replied) await interaction.editReply({ content: message.content, embeds: [] }).catch(() => undefined);
          else await interaction.reply(message).catch(() => undefined);
        }
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith("ticket:")) {
        await handleTicketButton(interaction);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket:")) {
        await handleTicketModal(interaction);
        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const commands = await loadCommands();
      const command = commands.get(interaction.commandName);

      if (!command) {
        logError("INTERACTION", `Unknown command interaction: ${interaction.commandName}`);
        try {
          await interaction.reply({
            content: `❌ Unknown command: \`${interaction.commandName}\`. Use \`/help\` to see available commands.`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (replyError) {
          logError("INTERACTION_REPLY", replyError);
        }
        return;
      }

      try {
        await runWithAckGuard(interaction, () => command.execute(interaction));
      } catch (error) {
        await handleInteractionError(interaction, error, "COMMAND");
      }
    } catch (error) {
      logError("INTERACTION_HANDLER", error);
    }
  },
};
