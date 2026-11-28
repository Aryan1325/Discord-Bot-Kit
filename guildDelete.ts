import { Events, type Guild } from "discord.js";
import type { BotEvent } from "../types/index.js";

export const event: BotEvent = {
  name: Events.GuildDelete,
  async execute(_client, ...args) {
    const guild = args[0] as Guild;
    console.log(`[GUILD] Removed from "${guild.name}" (${guild.id}).`);
  },
};
