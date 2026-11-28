import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a user's avatar.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to look up (defaults to you).").setRequired(false),
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    const avatarUrl = targetUser.displayAvatarURL({ size: 1024 });
    const downloadUrl = targetUser.displayAvatarURL({ size: 4096, extension: "png" });

    const embed = createEmbed({
      client: interaction.client,
      title: `${targetUser.username}'s Avatar`,
      description: `[Download full size](${downloadUrl})`,
      thumbnail: null,
      image: avatarUrl,
      fields: [
        { name: "Username", value: targetUser.username, inline: true },
        { name: "User ID", value: targetUser.id, inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
