import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed } from "../embeds/embedBuilder.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("emojiinfo")
    .setDescription("List this server's custom emojis.")
    .addStringOption((option) =>
      option.setName("name").setDescription("Look up a single emoji by name.").setRequired(false),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const emojis = await interaction.guild.emojis.fetch();
    const nameFilter = interaction.options.getString("name");

    if (nameFilter) {
      const match = emojis.find((emoji) => emoji.name?.toLowerCase() === nameFilter.toLowerCase());
      if (!match) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, `No emoji named **${nameFilter}** was found in this server.`)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embed = createEmbed({
        client: interaction.client,
        title: `Emoji Info — ${match.name}`,
        thumbnail: match.imageURL({ size: 256 }) ?? undefined,
        fields: [
          { name: "Name", value: `${match.name}`, inline: true },
          { name: "ID", value: match.id, inline: true },
          { name: "Animated", value: match.animated ? "Yes" : "No", inline: true },
          { name: "Mention", value: `\`${match.toString()}\``, inline: false },
          {
            name: "Created Date",
            value: match.createdTimestamp ? `<t:${Math.floor(match.createdTimestamp / 1000)}:F>` : "Unknown",
            inline: false,
          },
        ],
      });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (emojis.size === 0) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "This server doesn't have any custom emojis yet.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const staticEmojis = emojis.filter((emoji) => !emoji.animated);
    const animatedEmojis = emojis.filter((emoji) => emoji.animated);
    const list = emojis
      .map((emoji) => `${emoji.toString()} \`:${emoji.name}:\``)
      .slice(0, 40)
      .join(" ");

    const embed = createEmbed({
      client: interaction.client,
      title: `${interaction.guild.name} — Server Emojis`,
      description: list || "No emojis to display.",
      fields: [
        { name: "Total", value: `${emojis.size}`, inline: true },
        { name: "Static", value: `${staticEmojis.size}`, inline: true },
        { name: "Animated", value: `${animatedEmojis.size}`, inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
