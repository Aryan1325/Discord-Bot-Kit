import { Events } from "discord.js";
import type { BotEvent } from "../types/index.js";

export const event: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[READY] Logged in as ${client.user?.tag ?? "unknown user"}`);
    console.log(`[READY] Serving ${client.guilds.cache.size} server(s)`);
    console.log("[READY] AK ESPORTS is online and slash commands are active.");
  },
};
