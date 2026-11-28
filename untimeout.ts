import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { auditReason, fieldText, REASON_MAX_LENGTH } from "../utils/reason.js";
import { logModeration } from "../logging/moderation.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { checkModerationTarget, ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove an active timeout from a member.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The member to remove the timeout from.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setMaxLength(REASON_MAX_LENGTH).setDescription("Reason for removing the timeout.").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ModerateMembers, "Timeout Members"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.ModerateMembers, "Timeout Members"))) return;

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const check = checkModerationTarget(interaction, targetMember);
    if (!check.ok) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, check.reason)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!targetMember) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "That user isn't a member of this server.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!targetMember.communicationDisabledUntil) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "That user isn't currently timed out.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(interaction.client, "I can't modify this user — their role may be higher than mine."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await targetMember.timeout(null, auditReason(reason));

    const embed = createSuccessEmbed(interaction.client, `**${targetUser.tag}**'s timeout was removed.`);
    embed.addFields(
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: fieldText(reason), inline: true },
    );
    await interaction.reply({ embeds: [embed] });
    await logModeration(interaction, "Timeout removed", targetUser, reason);
  },
};
