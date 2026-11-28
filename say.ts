import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type GuildBasedChannel } from "discord.js";
import type { Command } from "../types/index.js";
import { createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureMemberPermission, mentionPolicy } from "../utils/permissions.js";
import { validateSendableChannel } from "../utils/validation.js";
import { createErrorEmbed } from "../embeds/embedBuilder.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot say something in this channel.")
    .addStringOption((option) =>
      option.setName("message").setDescription("The message for the bot to send.").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || !("send" in interaction.channel)) {
      await interaction.reply({
        content: "This command can only be used in a server text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageMessages, "Manage Messages"))) return;
    const channelCheck = validateSendableChannel(interaction.guild, interaction.channel as GuildBasedChannel, { allowThreads: true });
    if (!channelCheck.ok) {
      await interaction.reply({ embeds: [createErrorEmbed(interaction.client, channelCheck.reason)], flags: MessageFlags.Ephemeral });
      return;
    }

    const message = interaction.options.getString("message", true);

    await interaction.channel.send({
      content: message,
      allowedMentions: mentionPolicy(interaction),
    });

    await interaction.reply({
      embeds: [createSuccessEmbed(interaction.client, "Message sent.")],
      flags: MessageFlags.Ephemeral,
    });
  },
};
