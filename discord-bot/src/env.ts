import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See discord-bot/.env.example.`,
    );
  }
  return value;
}

export const env = {
  DISCORD_BOT_TOKEN: requireEnv("DISCORD_BOT_TOKEN"),
  DISCORD_CLIENT_ID: requireEnv("DISCORD_CLIENT_ID"),
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || undefined,
};
