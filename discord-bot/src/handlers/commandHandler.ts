import { Collection } from "discord.js";
import type { Command } from "../types/index.js";

let cachedCommands: Collection<string, Command> | null = null;

/**
 * The command registry. Every command module lives in `src/commands/` and
 * is imported here explicitly (rather than discovered dynamically) so the
 * production esbuild bundle can statically include every command file.
 *
 * To add a command: create `src/commands/<name>.ts` exporting
 * `command: Command`, then add one import line below.
 */
async function buildCommandCollection(): Promise<Collection<string, Command>> {
  const modules = await Promise.all([
    import("../commands/ping.js"),
    import("../commands/help.js"),
    import("../commands/avatar.js"),
    import("../commands/userinfo.js"),
    import("../commands/serverinfo.js"),
    import("../commands/kick.js"),
    import("../commands/ban.js"),
    import("../commands/unban.js"),
    import("../commands/timeout.js"),
    import("../commands/untimeout.js"),
    import("../commands/warn.js"),
    import("../commands/warnings.js"),
    import("../commands/clear.js"),
    import("../commands/say.js"),
    import("../commands/embed.js"),
    import("../commands/poll.js"),
    import("../commands/announce.js"),
    import("../commands/slowmode.js"),
    import("../commands/lock.js"),
    import("../commands/unlock.js"),
    import("../commands/coinflip.js"),
    import("../commands/dice.js"),
    import("../commands/8ball.js"),
    import("../commands/nick.js"),
    import("../commands/role.js"),
    import("../commands/membercount.js"),
    import("../commands/channelinfo.js"),
    import("../commands/roleinfo.js"),
    import("../commands/emojiinfo.js"),
    import("../commands/botinfo.js"),
    import("../commands/config.js"),
    import("../commands/ticket.js"),
    import("../commands/welcome.js"),
    import("../commands/goodbye.js"),
  ]);

  const commands = new Collection<string, Command>();
  for (const mod of modules) {
    commands.set(mod.command.data.name, mod.command);
  }
  return commands;
}

/** Loads (and caches) every registered slash command, keyed by command name. */
export async function loadCommands(): Promise<Collection<string, Command>> {
  if (!cachedCommands) {
    cachedCommands = await buildCommandCollection();
  }
  return cachedCommands;
}
