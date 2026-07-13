import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { checkModerationTarget, ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .addUserOption((option) => option.setName("user").setDescription("The member to kick.").setRequired(true))
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for the kick.").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.KickMembers, "Kick Members"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.KickMembers, "Kick Members"))) return;

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

    if (!targetMember.kickable) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(interaction.client, "I can't kick this user — their role may be higher than mine."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await targetMember
      .send({
        embeds: [
          createEmbed({
            client: interaction.client,
            title: `You were kicked from ${interaction.guild.name}`,
            description: `**Reason:** ${reason}`,
          }),
        ],
      })
      .catch(() => undefined);

    await targetMember.kick(reason);

    const embed = createSuccessEmbed(interaction.client, `**${targetUser.tag}** was kicked from the server.`);
    embed.addFields(
      { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Reason", value: reason, inline: true },
    );
    await interaction.reply({ embeds: [embed] });
  },
};
