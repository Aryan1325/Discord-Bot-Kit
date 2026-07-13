import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online and measure latency."),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: "Pinging...",
      withResponse: true,
    });

    const roundTripLatency =
      sent.resource?.message?.createdTimestamp !== undefined
        ? sent.resource.message.createdTimestamp - interaction.createdTimestamp
        : null;
    const wsLatency = Math.round(interaction.client.ws.ping);

    const parts = [`Pong! Websocket latency: ${wsLatency}ms`];
    if (roundTripLatency !== null) {
      parts.push(`Roundtrip latency: ${roundTripLatency}ms`);
    }

    await interaction.editReply(parts.join(" | "));
  },
};
