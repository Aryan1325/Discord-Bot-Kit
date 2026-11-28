import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { fieldText } from "../utils/reason.js";
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

    // Newest first, as many as fit in one embed (Discord caps descriptions at 4096 characters).
    const lines: string[] = [];
    let used = 0;
    for (const warning of [...warnings].reverse()) {
      const line = `**#${warning.id}** — <t:${Math.floor(warning.createdAt / 1000)}:R> by <@${warning.moderatorId}>\n${fieldText(warning.reason, 700)}`;
      if (used + line.length + 2 > 3800) break;
      lines.push(line);
      used += line.length + 2;
    }
    const description = lines.join("\n\n") + (lines.length < warnings.length ? `\n\n…and ${warnings.length - lines.length} older warning(s).` : "");

    const embed = createEmbed({
      client: interaction.client,
      title: `Warnings for ${targetUser.tag}`,
      description,
      fields: [{ name: "Total Warnings", value: `${warnings.length}`, inline: true }],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
