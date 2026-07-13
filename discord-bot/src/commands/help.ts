import { ButtonStyle, ComponentType, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed } from "../embeds/embedBuilder.js";
import { createButtonRows } from "../embeds/components.js";
import { botConfig } from "../config/botConfig.js";
import { formatUptime } from "../utils/formatUptime.js";
import { loadCommands } from "../handlers/commandHandler.js";
import { commandMeta } from "../utils/commandMeta.js";

type CategoryId = "home" | "general" | "utility" | "moderation" | "fun" | "admin";

const CATEGORY_LABELS: Record<CategoryId, string> = {
  home: "Home",
  general: "General",
  utility: "Utility",
  moderation: "Moderation",
  fun: "Fun",
  admin: "Admin",
};

const CATEGORY_EMOJIS: Record<CategoryId, string> = {
  home: "🏠",
  general: "📌",
  utility: "🛠",
  moderation: "🛡",
  fun: "🎉",
  admin: "⚙",
};

// Maps each existing command to the category it's shown under in /help.
const COMMAND_CATEGORIES: Record<string, Exclude<CategoryId, "home">> = {
  ping: "utility",
  help: "general",
  avatar: "general",
  userinfo: "utility",
  serverinfo: "utility",
  kick: "moderation",
  ban: "moderation",
  unban: "moderation",
  timeout: "moderation",
  untimeout: "moderation",
  warn: "moderation",
  warnings: "moderation",
  clear: "moderation",
  say: "utility",
  embed: "utility",
  poll: "utility",
  announce: "utility",
  slowmode: "utility",
  lock: "utility",
  unlock: "utility",
  coinflip: "fun",
  dice: "fun",
  "8ball": "fun",
  nick: "admin",
  role: "admin",
  membercount: "admin",
  channelinfo: "admin",
  roleinfo: "admin",
  emojiinfo: "admin",
  botinfo: "admin",
};

export const command: Command = {
  data: new SlashCommandBuilder().setName("help").setDescription("Show the AK ESPORTS command menu."),

  async execute(interaction) {
    const client = interaction.client;
    const commands = await loadCommands();

    const grouped = new Map<Exclude<CategoryId, "home">, string[]>();
    for (const cmd of commands.values()) {
      const category = COMMAND_CATEGORIES[cmd.data.name] ?? "general";
      const list = grouped.get(category) ?? [];
      const meta = commandMeta[cmd.data.name];

      const entry = meta
        ? `**\`/${cmd.data.name}\`** — ${cmd.data.description}\nUsage: \`${meta.usage}\`\nExample: \`${meta.example}\`\nPermission: ${meta.permission}`
        : `\`/${cmd.data.name}\` — ${cmd.data.description}`;

      list.push(entry);
      grouped.set(category, list);
    }

    const buildEmbed = (category: CategoryId) => {
      if (category === "home") {
        return createEmbed({
          client,
          title: `${CATEGORY_EMOJIS.home} ${botConfig.name} — Help Menu`,
          description: "Use the buttons below to browse commands by category.",
          fields: [
            { name: "Bot Version", value: botConfig.version, inline: true },
            { name: "Developer", value: botConfig.developer, inline: true },
            { name: "Ping", value: `${Math.round(client.ws.ping)}ms`, inline: true },
            { name: "Uptime", value: formatUptime(client.uptime ?? 0), inline: true },
            { name: "Server Count", value: `${client.guilds.cache.size}`, inline: true },
            {
              name: "User Count",
              value: `${client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0)}`,
              inline: true,
            },
          ],
        });
      }

      const commandList = grouped.get(category);
      return createEmbed({
        client,
        title: `${botConfig.name} — ${CATEGORY_EMOJIS[category]} ${CATEGORY_LABELS[category]} Commands`,
        description:
          commandList && commandList.length > 0
            ? commandList.join("\n\n")
            : "No commands in this category yet — check back soon.",
      });
    };

    const rows = createButtonRows(
      (Object.keys(CATEGORY_LABELS) as CategoryId[]).map((category) => ({
        customId: `help:${category}`,
        label: CATEGORY_LABELS[category],
        emoji: CATEGORY_EMOJIS[category],
        style: category === "home" ? ButtonStyle.Primary : ButtonStyle.Secondary,
      })),
    );

    const message = await interaction.reply({
      embeds: [buildEmbed("home")],
      components: rows,
      withResponse: true,
    });

    const reply = message.resource?.message ?? (await interaction.fetchReply());

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    });

    collector.on("collect", async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: "Only the person who ran /help can use these buttons.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const category = buttonInteraction.customId.split(":")[1] as CategoryId;
      await buttonInteraction.update({ embeds: [buildEmbed(category)] });
    });

    collector.on("end", () => {
      interaction.editReply({ components: [] }).catch(() => undefined);
    });
  },
};
