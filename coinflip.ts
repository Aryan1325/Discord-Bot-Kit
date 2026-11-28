import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

export const command: Command = {
  data: new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin."),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";

    const embed = createEmbed({
      client: interaction.client,
      title: "🪙 Coin Flip",
      description: `The coin landed on **${result}**!`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
