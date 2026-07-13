import os from "node:os";
import { SlashCommandBuilder, version as djsVersion } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";
import { botConfig } from "../config/botConfig.js";
import { formatUptime } from "../utils/formatUptime.js";
import { loadCommands } from "../handlers/commandHandler.js";

function formatMemory(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const command: Command = {
  data: new SlashCommandBuilder().setName("botinfo").setDescription("Show detailed information about the bot."),

  async execute(interaction) {
    const client = interaction.client;
    const commands = await loadCommands();
    const memory = process.memoryUsage();
    const loadAverage = os.loadavg()[0];
    const userCount = client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);

    const embed = createEmbed({
      client,
      title: `${botConfig.name} — Bot Information`,
      description: "Live status and system stats for the bot.",
      fields: [
        { name: "Bot Version", value: botConfig.version, inline: true },
        { name: "Discord.js Version", value: djsVersion, inline: true },
        { name: "Node.js Version", value: process.version, inline: true },
        { name: "Ping", value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: "Uptime", value: formatUptime(client.uptime ?? 0), inline: true },
        { name: "Memory Usage", value: `${formatMemory(memory.rss)} (heap: ${formatMemory(memory.heapUsed)})`, inline: true },
        { name: "CPU Load (1m avg)", value: loadAverage !== undefined ? loadAverage.toFixed(2) : "Unavailable", inline: true },
        { name: "Developer", value: botConfig.developer, inline: true },
        { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
        { name: "Users", value: `${userCount}`, inline: true },
        { name: "Commands Loaded", value: `${commands.size}`, inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
