import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed } from "../embeds/embedBuilder.js";
import { MessageFlags } from "discord.js";

const THUMBS_UP = "👍";
const THUMBS_DOWN = "👎";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a quick yes/no poll.")
    .addStringOption((option) =>
      option.setName("question").setDescription("The question to poll the channel on.").setRequired(true),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const question = interaction.options.getString("question", true);

    const embed = createEmbed({
      client: interaction.client,
      title: "📊 New Poll",
      description: question,
      footer: { text: `Poll started by ${interaction.user.tag}` },
    });

    const response = await interaction.reply({ embeds: [embed], withResponse: true });
    const message = response.resource?.message ?? (await interaction.fetchReply());

    try {
      await message.react(THUMBS_UP);
      await message.react(THUMBS_DOWN);
    } catch (error) {
      console.error("[POLL] Failed to add reactions:", error);
      await interaction
        .followUp({
          embeds: [createErrorEmbed(interaction.client, "The poll was posted, but I couldn't add the reaction buttons.")],
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => undefined);
    }
  },
};
