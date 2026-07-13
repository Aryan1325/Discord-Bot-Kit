import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { getCommands } from "../loadCommands.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List all available commands."),

  async execute(interaction) {
    const commands = await getCommands();

    const embed = new EmbedBuilder()
      .setTitle("Available commands")
      .setColor(0x5865f2)
      .setDescription(
        [...commands.values()]
          .map((c) => `**/${c.data.name}** — ${c.data.description}`)
          .join("\n"),
      );

    await interaction.reply({ embeds: [embed] });
  },
};
