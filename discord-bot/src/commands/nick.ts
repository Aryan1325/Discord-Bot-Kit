import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { checkModerationTarget, ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("nick")
    .setDescription("Change a member's nickname.")
    .addUserOption((option) => option.setName("user").setDescription("The member to rename.").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("nickname")
        .setDescription("The new nickname. Leave empty to reset to their username.")
        .setMaxLength(32)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageNicknames, "Manage Nicknames"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.ManageNicknames, "Manage Nicknames"))) return;

    const targetUser = interaction.options.getUser("user", true);
    const nickname = interaction.options.getString("nickname");
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "That user isn't a member of this server.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const check = checkModerationTarget(interaction, targetMember);
    if (!check.ok) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, check.reason)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!targetMember.manageable) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(interaction.client, "I can't change this user's nickname — their role may be higher than mine."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await targetMember.setNickname(nickname);

    const embed = createSuccessEmbed(
      interaction.client,
      nickname
        ? `**${targetUser.tag}**'s nickname was changed to **${nickname}**.`
        : `**${targetUser.tag}**'s nickname was reset.`,
    );
    await interaction.reply({ embeds: [embed] });
  },
};
