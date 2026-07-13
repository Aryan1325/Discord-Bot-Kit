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
import { getCommands } from "./loadCommands.js";

async function main() {
  const commands = await getCommands();
  const body = [...commands.values()].map((command) => command.data.toJSON());

  const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

  const route = env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  console.log(
    `Registering ${body.length} command(s) ${
      env.DISCORD_GUILD_ID ? `to guild ${env.DISCORD_GUILD_ID}` : "globally"
    }...`,
  );

  const result = (await rest.put(route, { body })) as unknown[];

  console.log(`Successfully registered ${result.length} command(s).`);
}

main().catch((error) => {
  console.error("Failed to register commands:", error);
  process.exit(1);
});
