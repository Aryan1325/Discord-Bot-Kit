import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./env.js";
import { getCommands } from "./loadCommands.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const commands = await getCommands();
  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching "${interaction.commandName}" was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command "${interaction.commandName}":`, error);

    const failureMessage = {
      content: "There was an error while executing this command.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(failureMessage);
    } else {
      await interaction.reply(failureMessage);
    }
  }
});

client.login(env.DISCORD_BOT_TOKEN);

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  client.destroy();
  process.exit(0);
});
