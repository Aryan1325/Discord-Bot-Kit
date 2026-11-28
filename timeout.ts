import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { auditReason, fieldText, REASON_MAX_LENGTH } from "../utils/reason.js";
import { logModeration } from "../logging/moderation.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { checkModerationTarget, ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

const MAX_TIMEOUT_MINUTES = 40_320; // Discord's cap: 28 days.

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Temporarily mute a member so they can't send messages or speak.")
    .addUserOption((option) => option.setName("user").setDescription("The member to time out.").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("How long to time the member out for, in minutes (max 40320 / 28 days).")
        .setMinValue(1)
        .setMaxValue(MAX_TIMEOUT_MINUTES)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setMaxLength(REASON_MAX_LENGTH).setDescription("Reason for the timeout.").setRequired(false),
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
    const minutes = interaction.options.getInteger("minutes", true);
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

    if (!targetMember.moderatable) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(interaction.client, "I can't time out this user — their role may be higher than mine."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await targetMember.timeout(minutes * 60_000, auditReason(reason));

    await targetMember
      .send({
        embeds: [
          createEmbed({
            client: interaction.client,
            title: `You were timed out in ${interaction.guild.name}`,
            description: `**Duration:** ${minutes} minute(s)\n**Reason:** ${reason}`,
          }),
        ],
      })
      .catch(() => undefined);

    const embed = createSuccessEmbed(
      interaction.client,
      `**${targetUser.tag}** was timed out for ${minutes} minute(s).`,
    );
    embed.addFields(
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: fieldText(reason), inline: true },
    );
    await interaction.reply({ embeds: [embed] });
    await logModeration(interaction, "Timeout", targetUser, reason);
  },
};
