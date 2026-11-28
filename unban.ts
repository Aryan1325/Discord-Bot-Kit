import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { auditReason, fieldText, REASON_MAX_LENGTH } from "../utils/reason.js";
import { logModeration } from "../logging/moderation.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by their ID.")
    .addStringOption((option) =>
      option.setName("user_id").setDescription("The Discord ID of the user to unban.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setMaxLength(REASON_MAX_LENGTH).setDescription("Reason for the unban.").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.BanMembers, "Ban Members"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.BanMembers, "Ban Members"))) return;

    const userId = interaction.options.getString("user_id", true).trim();
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "That doesn't look like a valid Discord user ID.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Fetch just this user's ban — listing every ban on a large server is slow and can miss the 3s deadline.
    const bannedEntry = await interaction.guild.bans.fetch(userId).catch(() => null);

    if (!bannedEntry) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "That user isn't currently banned.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.guild.members.unban(userId, auditReason(reason));

    const embed = createSuccessEmbed(interaction.client, `**${bannedEntry.user.tag}** was unbanned.`);
    embed.addFields(
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: fieldText(reason), inline: true },
    );
    await interaction.reply({ embeds: [embed] });
    await logModeration(interaction, "Unban", { id: userId }, reason);
  },
};
