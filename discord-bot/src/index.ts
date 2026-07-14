import { Client, GatewayIntentBits, Partials } from "discord.js";
import { env } from "./env.js";
import { loadCommands } from "./handlers/commandHandler.js";
import { loadEvents } from "./handlers/eventHandler.js";
import { getDb, getDatabaseStatus } from "./database/db.js";
import { installGlobalErrorHandlers, logError } from "./errors/errorHandler.js";
import { deployCommands } from "./deploy-commands.js";

async function main() {
  // Installed first so nothing below this line can crash the process.
  installGlobalErrorHandlers();

  getDb(); // Opens the SQLite connection and runs migrations before anything else starts.
  const dbStatus = getDatabaseStatus();
  console.log(`[STARTUP] Database ready: ${dbStatus.ready} (${dbStatus.path})`);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
    ],
    partials: [Partials.User, Partials.GuildMember, Partials.Message, Partials.Channel],
  });

  const commands = await loadCommands();
  console.log(`[STARTUP] Loaded ${commands.size} slash command(s).`);

  // Deploy commands on startup to ensure Discord has the latest versions
  console.log("[STARTUP] Deploying slash commands to Discord...");
  try {
    await deployCommands();
    console.log("[STARTUP] Slash commands deployed successfully.");
  } catch (error) {
    console.error("[STARTUP] Failed to deploy commands, but continuing bot startup:", error);
  }

  loadEvents(client);

  await client.login(env.DISCORD_BOT_TOKEN);
}

main().catch((error) => {
  logError("STARTUP", error);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("[PROCESS] Received SIGTERM, shutting down...");
  process.exit(0);
});
