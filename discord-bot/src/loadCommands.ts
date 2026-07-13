import type { Collection } from "discord.js";
import { Collection as DiscordCollection } from "discord.js";
import type { Command } from "./types.js";

let cachedCommands: Collection<string, Command> | null = null;

/**
 * Statically imports every command module and indexes it by command name.
 * Add a new command by creating a file in `src/commands/` that exports a
 * `command: Command` and importing it here.
 */
async function buildCommandCollection(): Promise<Collection<string, Command>> {
  const modules = await Promise.all([
    import("./commands/ping.js"),
    import("./commands/help.js"),
  ]);

  const commands = new DiscordCollection<string, Command>();
  for (const mod of modules) {
    commands.set(mod.command.data.name, mod.command);
  }
  return commands;
}

export async function getCommands(): Promise<Collection<string, Command>> {
  if (!cachedCommands) {
    cachedCommands = await buildCommandCollection();
  }
  return cachedCommands;
}
