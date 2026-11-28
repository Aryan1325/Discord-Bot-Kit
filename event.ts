import type { Client, ClientEvents } from "discord.js";

/**
 * A bot lifecycle event. `execute` always receives the ready client first,
 * followed by whatever arguments Discord.js emits for `name` (typed as
 * `unknown[]` here since a single array can't express every event's
 * signature at once — cast inside each event file as needed).
 */
export interface BotEvent {
  name: keyof ClientEvents;
  once?: boolean;
  execute: (client: Client, ...args: unknown[]) => Promise<void> | void;
}
