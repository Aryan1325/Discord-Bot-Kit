/**
 * Registers all slash commands with Discord.
 *
 * Run with `pnpm --filter @workspace/discord-bot run deploy-commands`
 * whenever a command is added, removed, or changed.
 *
 * If DISCORD_GUILD_ID is set, commands are registered to that single guild
 * (near-instant, ideal while developing). Otherwise they are registered
 * globally (can take up to an hour to propagate to every server).
 */
import { REST, Routes } from "discord.js";
import { env } from "./env.js";
import { loadCommands } from "./handlers/commandHandler.js";

export async function deployCommands() {
  const commands = await loadCommands();
  const body = [...commands.values()].map((command) => command.data.toJSON());

  if (env.DISCORD_GUILD_ID) {
    console.warn(
      "[DEPLOY] DISCORD_GUILD_ID is set — commands are registered ONLY in that one server. " +
        "Other servers (e.g. a friend's) will not see them. Remove DISCORD_GUILD_ID for multi-server use.",
    );
  }

  const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

  const route = env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  console.log(
    `[DEPLOY] Registering ${body.length} command(s) ${
      env.DISCORD_GUILD_ID ? `to guild ${env.DISCORD_GUILD_ID}` : "globally"
    }...`,
  );

  const result = (await rest.put(route, { body })) as unknown[];

  console.log(`[DEPLOY] Successfully registered ${result.length} command(s): ${[...commands.keys()].join(", ")}`);
  return result;
}

// Support running as standalone script via `pnpm run deploy-commands`
if (import.meta.url === `file://${process.argv[1]}`) {
  deployCommands().catch((error) => {
    console.error("[DEPLOY] Failed to register commands:", error);
    process.exit(1);
  });
}
