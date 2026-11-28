import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

const RESPONSES = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes, definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
  "Absolutely not.",
  "The odds are in your favor.",
];

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question.")
    .addStringOption((option) =>
      option.setName("question").setDescription("The question to ask.").setRequired(true),
    ),

  async execute(interaction) {
    const question = interaction.options.getString("question", true);
    const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    const embed = createEmbed({
      client: interaction.client,
      title: "🎱 Magic 8-Ball",
      fields: [
        { name: "Question", value: question },
        { name: "Answer", value: answer },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
