import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

const MAX_SLOWMODE_SECONDS = 21_600; // Discord's cap: 6 hours.

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set this channel's slowmode delay.")
    .addIntegerOption((option) =>
      option
        .setName("seconds")
        .setDescription("Slowmode delay in seconds (0 to disable, max 21600).")
        .setMinValue(0)
        .setMaxValue(MAX_SLOWMODE_SECONDS)
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!interaction.guild || !(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        content: "This command can only be used in a server text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageChannels, "Manage Channels"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.ManageChannels, "Manage Channels"))) return;

    const seconds = interaction.options.getInteger("seconds", true);

    try {
      await interaction.channel.setRateLimitPerUser(seconds);
    } catch (error) {
      console.error("[SLOWMODE] Failed to set rate limit:", error);
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "I couldn't update the slowmode for this channel.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = createSuccessEmbed(
      interaction.client,
      seconds === 0
        ? "Slowmode has been disabled for this channel."
        : `Slowmode set to **${seconds}** second(s) for this channel.`,
    );
    await interaction.reply({ embeds: [embed] });
  },
};
