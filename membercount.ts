import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed } from "../embeds/embedBuilder.js";

export const command: Command = {
  data: new SlashCommandBuilder().setName("membercount").setDescription("Show a breakdown of this server's member count."),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const guild = await interaction.guild.fetch();
    const members = await guild.members.fetch().catch(() => null);

    if (!members) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "I couldn't fetch the member list for this server.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const bots = members.filter((member) => member.user.bot).size;
    const humans = members.size - bots;

    const embed = createEmbed({
      client: interaction.client,
      title: `${guild.name} — Member Count`,
      fields: [
        { name: "Humans", value: `${humans}`, inline: true },
        { name: "Bots", value: `${bots}`, inline: true },
        { name: "Total Members", value: `${guild.memberCount}`, inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
