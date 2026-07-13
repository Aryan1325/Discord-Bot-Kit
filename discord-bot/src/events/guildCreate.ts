import { Events, type Guild } from "discord.js";
import type { BotEvent } from "../types/index.js";

export const event: BotEvent = {
  name: Events.GuildCreate,
  async execute(_client, ...args) {
    const guild = args[0] as Guild;
    console.log(`[GUILD] Joined "${guild.name}" (${guild.id}) — now in ${guild.memberCount} member server.`);
  },
};
