import { ChannelType, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

const BOOST_LEVEL_LABELS: Record<number, string> = {
  0: "None",
  1: "Level 1",
  2: "Level 2",
  3: "Level 3",
};

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show detailed information about this server."),

  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
      });
      return;
    }

    const owner = await guild.fetchOwner().catch(() => null);
    const channelCount = guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory).size;

    const embed = createEmbed({
      client: interaction.client,
      title: `${guild.name}`,
      thumbnail: guild.iconURL({ size: 256 }) ?? undefined,
      description: guild.description ?? "No server description set.",
      fields: [
        { name: "Owner", value: owner ? `<@${owner.id}>` : "Unknown", inline: true },
        { name: "Members", value: `${guild.memberCount}`, inline: true },
        { name: "Channels", value: `${channelCount}`, inline: true },
        { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
        {
          name: "Boost Level",
          value: BOOST_LEVEL_LABELS[guild.premiumTier] ?? `${guild.premiumTier}`,
          inline: true,
        },
        { name: "Boost Count", value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
      ],
      image: guild.bannerURL({ size: 1024 }) ?? undefined,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
