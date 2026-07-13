import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed } from "../embeds/embedBuilder.js";
import { ensureMemberPermission } from "../utils/permissions.js";
import { getWarnings } from "../utils/warningsStore.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View a member's warning history.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The member to look up (defaults to you).").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ModerateMembers, "Timeout Members"))) return;

    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    const warnings = getWarnings(interaction.guild.id, targetUser.id);

    if (warnings.length === 0) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, `**${targetUser.tag}** has no warnings on record.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const description = warnings
      .slice(-10)
      .map(
        (warning) =>
          `**#${warning.id}** — <t:${Math.floor(warning.createdAt / 1000)}:R> by <@${warning.moderatorId}>\n${warning.reason}`,
      )
      .join("\n\n");

    const embed = createEmbed({
      client: interaction.client,
      title: `Warnings for ${targetUser.tag}`,
      description,
      fields: [{ name: "Total Warnings", value: `${warnings.length}`, inline: true }],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
