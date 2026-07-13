import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

const CHANNEL_TYPE_LABELS: Partial<Record<ChannelType, string>> = {
  [ChannelType.GuildText]: "Text Channel",
  [ChannelType.GuildVoice]: "Voice Channel",
  [ChannelType.GuildCategory]: "Category",
  [ChannelType.GuildAnnouncement]: "Announcement Channel",
  [ChannelType.GuildStageVoice]: "Stage Channel",
  [ChannelType.GuildForum]: "Forum Channel",
  [ChannelType.GuildMedia]: "Media Channel",
  [ChannelType.PublicThread]: "Public Thread",
  [ChannelType.PrivateThread]: "Private Thread",
  [ChannelType.AnnouncementThread]: "Announcement Thread",
};

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("channelinfo")
    .setDescription("Show information about a channel.")
    .addChannelOption((option) =>
      option.setName("channel").setDescription("The channel to look up (defaults to this channel).").setRequired(false),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const channelOption = interaction.options.getChannel("channel") ?? interaction.channel;

    if (!channelOption) {
      await interaction.reply({ content: "I couldn't resolve that channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = interaction.guild.channels.cache.get(channelOption.id) ?? (await interaction.guild.channels.fetch(channelOption.id).catch(() => null));

    if (!channel) {
      await interaction.reply({ content: "I couldn't resolve that channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = createEmbed({
      client: interaction.client,
      title: `Channel Info — ${"name" in channel ? channel.name : "Unknown"}`,
      fields: [
        { name: "Channel Name", value: "name" in channel && channel.name ? `#${channel.name}` : "Unknown", inline: true },
        { name: "Channel ID", value: channel.id, inline: true },
        { name: "Channel Type", value: CHANNEL_TYPE_LABELS[channel.type] ?? `Type ${channel.type}`, inline: true },
        {
          name: "Created Date",
          value: channel.createdTimestamp ? `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>` : "Unknown",
          inline: false,
        },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
