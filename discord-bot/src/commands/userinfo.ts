import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";
import { getBadgeLabels } from "../utils/badges.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show detailed information about a user.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to look up (defaults to you).").setRequired(false),
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    // Force-fetch to get banner data, which isn't included in cached partials.
    const fullUser = await targetUser.fetch(true).catch(() => targetUser);
    const member = interaction.guild ? await interaction.guild.members.fetch(fullUser.id).catch(() => null) : null;

    const badges = getBadgeLabels(fullUser.flags);
    const roles =
      member?.roles.cache
        .filter((role) => role.id !== interaction.guild?.id)
        .sort((a, b) => b.position - a.position)
        .map((role) => `<@&${role.id}>`) ?? [];

    const banner = fullUser.bannerURL({ size: 1024 });

    const embed = createEmbed({
      client: interaction.client,
      title: `${fullUser.username}`,
      thumbnail: fullUser.displayAvatarURL({ size: 512 }),
      image: banner ?? undefined,
      fields: [
        { name: "Username", value: fullUser.tag ?? fullUser.username, inline: true },
        { name: "User ID", value: fullUser.id, inline: true },
        { name: "Bot Account", value: fullUser.bot ? "Yes" : "No", inline: true },
        { name: "Account Created", value: `<t:${Math.floor(fullUser.createdTimestamp / 1000)}:F>`, inline: true },
        {
          name: "Joined Server",
          value: member?.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
            : "Not in this server",
          inline: true,
        },
        {
          name: `Roles (${roles.length})`,
          value: roles.length > 0 ? roles.slice(0, 20).join(", ") : "No roles",
          inline: false,
        },
        {
          name: "Badges",
          value: badges.length > 0 ? badges.join(", ") : "No badges",
          inline: false,
        },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
