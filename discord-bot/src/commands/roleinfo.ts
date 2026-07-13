import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("roleinfo")
    .setDescription("Show information about a role.")
    .addRoleOption((option) => option.setName("role").setDescription("The role to look up.").setRequired(true)),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const role = interaction.options.getRole("role", true);
    const fullRole = interaction.guild.roles.cache.get(role.id) ?? (await interaction.guild.roles.fetch(role.id));

    if (!fullRole) {
      await interaction.reply({ content: "I couldn't find that role.", flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = createEmbed({
      client: interaction.client,
      title: `Role Info — ${fullRole.name}`,
      color: fullRole.color || undefined,
      fields: [
        { name: "Role Name", value: fullRole.name, inline: true },
        { name: "Role ID", value: fullRole.id, inline: true },
        { name: "Members", value: `${fullRole.members.size}`, inline: true },
        { name: "Color", value: fullRole.hexColor === "#000000" ? "Default" : fullRole.hexColor, inline: true },
        { name: "Created Date", value: `<t:${Math.floor(fullRole.createdTimestamp / 1000)}:F>`, inline: false },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
