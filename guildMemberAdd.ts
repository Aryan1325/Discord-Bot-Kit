import { Events, type GuildMember } from "discord.js";
import type { BotEvent } from "../types/index.js";
import { handleMemberJoin } from "../welcome/service.js";
import { logError } from "../errors/errorHandler.js";

export const event: BotEvent = {
  name: Events.GuildMemberAdd,
  async execute(_client, ...args) {
    const member = args[0] as GuildMember;
    try {
      await handleMemberJoin(member);
    } catch (error) {
      logError("GUILD_MEMBER_ADD", error);
    }
  },
};
