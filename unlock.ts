import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock this channel so @everyone can send messages again.")
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
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.ManageRoles, "Manage Roles"))) return;

    const channel = interaction.channel;
    const everyoneRole = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
    } catch (error) {
      console.error("[UNLOCK] Failed to edit permission overwrites:", error);
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "I couldn't update this channel's permissions.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = createSuccessEmbed(interaction.client, `🔓 ${channel} has been unlocked. Everyone can send messages again.`);
    await interaction.reply({ embeds: [embed] });
  },
};
