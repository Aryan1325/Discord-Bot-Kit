import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency and API status."),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: "Pinging...",
      withResponse: true,
    });

    const botPing =
      sent.resource?.message?.createdTimestamp !== undefined
        ? sent.resource.message.createdTimestamp - interaction.createdTimestamp
        : null;
    const apiPing = Math.round(interaction.client.ws.ping);

    const latencyLabel =
      apiPing < 150 ? "Excellent" : apiPing < 300 ? "Good" : apiPing < 500 ? "Fair" : "Poor";

    const embed = createEmbed({
      client: interaction.client,
      title: "Pong!",
      description: "Live latency readout for AK ESPORTS.",
      fields: [
        { name: "Bot Ping", value: botPing !== null ? `${botPing}ms` : "Unavailable", inline: true },
        { name: "API Ping", value: `${apiPing}ms`, inline: true },
        { name: "Connection Quality", value: latencyLabel, inline: true },
      ],
    });

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};
