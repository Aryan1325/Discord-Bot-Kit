import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export const command: Command = {
  data: new SlashCommandBuilder().setName("dice").setDescription("Roll a six-sided dice."),

  async execute(interaction) {
    const roll = Math.floor(Math.random() * 6) + 1;

    const embed = createEmbed({
      client: interaction.client,
      title: "🎲 Dice Roll",
      description: `${DICE_FACES[roll - 1]} You rolled a **${roll}**!`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
