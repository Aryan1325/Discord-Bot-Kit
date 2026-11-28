import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import type { BotEvent } from "../types/index.js";
import { handleMemberLeave } from "../welcome/service.js";
import { logError } from "../errors/errorHandler.js";

export const event: BotEvent = {
  name: Events.GuildMemberRemove,
  async execute(_client, ...args) {
    const member = args[0] as GuildMember | PartialGuildMember;
    try {
      await handleMemberLeave(member as GuildMember);
    } catch (error) {
      logError("GUILD_MEMBER_REMOVE", error);
    }
  },
};
