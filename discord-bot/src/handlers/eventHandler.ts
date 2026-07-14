import type { Client } from "discord.js";
import { event as readyEvent } from "../events/ready.js";
import { event as interactionCreateEvent } from "../events/interactionCreate.js";
import { event as guildCreateEvent } from "../events/guildCreate.js";
import { event as guildDeleteEvent } from "../events/guildDelete.js";
import { event as guildMemberAddEvent } from "../events/guildMemberAdd.js";
import { event as guildMemberRemoveEvent } from "../events/guildMemberRemove.js";
import type { BotEvent } from "../types/index.js";

/**
 * The event registry. Every event module lives in `src/events/` and is
 * imported here explicitly for the same static-bundling reason as
 * `commandHandler.ts`.
 *
 * To add an event: create `src/events/<name>.ts` exporting `event: BotEvent`,
 * then add one import + one array entry below.
 */
const events: BotEvent[] = [
  readyEvent,
  interactionCreateEvent,
  guildCreateEvent,
  guildDeleteEvent,
  guildMemberAddEvent,
  guildMemberRemoveEvent,
];

/** Binds every registered event to the client. */
export function loadEvents(client: Client): void {
  for (const botEvent of events) {
    const listener = (...args: unknown[]) => {
      void Promise.resolve(botEvent.execute(client, ...args)).catch((error: unknown) => {
        console.error(`[EVENT] Unhandled error in "${botEvent.name}" handler:`, error);
      });
    };

    if (botEvent.once) {
      client.once(botEvent.name, listener);
    } else {
      client.on(botEvent.name, listener);
    }
  }

  console.log(`[STARTUP] Loaded ${events.length} event handler(s).`);
}
