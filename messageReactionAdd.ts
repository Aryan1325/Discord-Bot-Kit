import { Events, type MessageReaction, type PartialMessageReaction, type PartialUser, type User } from "discord.js";
import type { BotEvent } from "../types/index.js";
import { handleReactionRoleChange } from "../reactionRoles/service.js";

export const event: BotEvent = {
  name: Events.MessageReactionAdd,
  async execute(_client, ...args) {
    await handleReactionRoleChange(args[0] as MessageReaction | PartialMessageReaction, args[1] as User | PartialUser, "add");
  },
};
