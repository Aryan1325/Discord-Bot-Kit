import { Client, GatewayIntentBits, Partials } from "discord.js";
import { env } from "./env.js";
import { loadCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.User, Partials.GuildMember],
  });

  const commands = await loadCommands();
  console.log(`[STARTUP] Loaded ${commands.size} slash command(s).`);

  loadEvents(client);

  await client.login(env.DISCORD_BOT_TOKEN);
}

main().catch((error) => {
  console.error("[STARTUP] Fatal error while starting AK ESPORTS bot:", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("[PROCESS] Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("[PROCESS] Uncaught exception:", error);
});

process.on("SIGTERM", () => {
  console.log("[PROCESS] Received SIGTERM, shutting down...");
  process.exit(0);
});
