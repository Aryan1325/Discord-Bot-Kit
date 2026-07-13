import { Events, MessageFlags, type Interaction } from "discord.js";
import type { BotEvent } from "../types/index.js";
import { loadCommands } from "../handlers/commandHandler.js";
import { createErrorEmbed } from "../embeds/embedBuilder.js";

export const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(client, ...args) {
    const interaction = args[0] as Interaction;

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const commands = await loadCommands();
    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(`[COMMAND] Unknown command interaction: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[COMMAND] Error executing "${interaction.commandName}":`, error);

      const embed = createErrorEmbed(
        client,
        "This command hit an unexpected error. It's been logged — please try again in a moment.",
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
      } catch (followUpError) {
        console.error("[COMMAND] Failed to deliver error embed to the user:", followUpError);
      }
    }
  },
};
