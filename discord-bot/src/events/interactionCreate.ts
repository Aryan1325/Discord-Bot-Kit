import { Events, MessageFlags, type Interaction } from "discord.js";
import type { BotEvent } from "../types/index.js";
import { loadCommands } from "../handlers/commandHandler.js";
import { handleInteractionError, logError } from "../errors/errorHandler.js";
import { handleTicketButton, handleTicketModal } from "../tickets/interactionHandlers.js";

export const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(_client, ...args) {
    const interaction = args[0] as Interaction;

    try {
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
        await command.execute(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error, "COMMAND");
      }
    } catch (error) {
      logError("INTERACTION_HANDLER", error);
    }
  },
};
