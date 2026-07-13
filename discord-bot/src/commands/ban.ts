import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { checkModerationTarget, ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

const SECONDS_PER_DAY = 86_400;

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server.")
    .addUserOption((option) => option.setName("user").setDescription("The user to ban.").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for the ban.").setRequired(false))
    .addIntegerOption((option) =>
      option
        .setName("delete_days")
        .setDescription("Days of their recent messages to delete (0-7). Defaults to 0.")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.BanMembers, "Ban Members"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.BanMembers, "Ban Members"))) return;

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const check = checkModerationTarget(interaction, targetMember);
    if (!check.ok) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, check.reason)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (targetMember && !targetMember.bannable) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(interaction.client, "I can't ban this user — their role may be higher than mine."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (targetMember) {
      await targetMember
        .send({
          embeds: [
            createEmbed({
              client: interaction.client,
              title: `You were banned from ${interaction.guild.name}`,
              description: `**Reason:** ${reason}`,
            }),
          ],
        })
        .catch(() => undefined);
    }

    await interaction.guild.members.ban(targetUser.id, {
      reason,
      deleteMessageSeconds: deleteDays * SECONDS_PER_DAY,
    });

    const embed = createSuccessEmbed(interaction.client, `**${targetUser.tag}** was banned from the server.`);
    embed.addFields(
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: reason, inline: true },
    );
    await interaction.reply({ embeds: [embed] });
  },
};
