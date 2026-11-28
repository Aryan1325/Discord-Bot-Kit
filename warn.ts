import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { auditReason, fieldText, REASON_MAX_LENGTH } from "../utils/reason.js";
import { logModeration } from "../logging/moderation.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { checkModerationTarget, ensureMemberPermission } from "../utils/permissions.js";
import { addWarning } from "../utils/warningsStore.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a warning to a member.")
    .addUserOption((option) => option.setName("user").setDescription("The member to warn.").setRequired(true))
    .addStringOption((option) =>
      option.setName("reason").setMaxLength(REASON_MAX_LENGTH).setDescription("Reason for the warning.").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ModerateMembers, "Timeout Members"))) return;

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const check = checkModerationTarget(interaction, targetMember);
    if (!check.ok) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, check.reason)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason);

    await targetUser
      .send({
        embeds: [
          createEmbed({
            client: interaction.client,
            title: `You were warned in ${interaction.guild.name}`,
            description: `**Reason:** ${reason}`,
          }),
        ],
      })
      .catch(() => undefined);

    const embed = createSuccessEmbed(interaction.client, `**${targetUser.tag}** has been warned.`);
    embed.addFields(
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: fieldText(reason), inline: true },
    );
    await interaction.reply({ embeds: [embed] });
    await logModeration(interaction, "Warning", targetUser, reason);
  },
};
