import { Events, type Interaction } from "discord.js";
import type { BotEvent } from "../types/index.js";
import { loadCommands } from "../handlers/commandHandler.js";
import { handleInteractionError, logError } from "../errors/errorHandler.js";

export const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(_client, ...args) {
    const interaction = args[0] as Interaction;

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const commands = await loadCommands();
    const command = commands.get(interaction.commandName);

    if (!command) {
      logError("INTERACTION", `Unknown command interaction: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await handleInteractionError(interaction, error, "COMMAND");
    }
  },
};
