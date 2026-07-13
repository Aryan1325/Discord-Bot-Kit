# Discord Bot

A Discord.js v14 bot with slash commands.

## Structure

```
discord-bot/
├── src/
│   ├── index.ts             # Bot entry point — logs in and routes interactions
│   ├── deploy-commands.ts   # Registers slash commands with Discord's API
│   ├── loadCommands.ts      # Central command registry
│   ├── env.ts                # Typed, validated environment variables
│   ├── types.ts              # Shared Command interface
│   └── commands/
│       ├── ping.ts           # /ping — latency check
│       └── help.ts           # /help — lists available commands
├── .env.example
├── build.mjs                 # esbuild production bundle
└── package.json
```

## Setup

1. Create an application at the [Discord Developer Portal](https://discord.com/developers/applications), add a Bot user, and copy:
   - **Bot Token** → `DISCORD_BOT_TOKEN`
   - **Application ID** → `DISCORD_CLIENT_ID`
2. Under OAuth2 → URL Generator, select the `bot` and `applications.commands` scopes to generate an invite link, then invite the bot to a server.
3. Copy `.env.example` to `.env` and fill in the values (or use Replit Secrets — already configured for this project).
4. Register the slash commands (run again any time a command is added/changed):
   ```
   pnpm --filter @workspace/discord-bot run deploy-commands
   ```
5. Start the bot:
   ```
   pnpm --filter @workspace/discord-bot run dev
   ```

## Adding a new command

1. Create `src/commands/<name>.ts` exporting `command: Command` (see `ping.ts` for the shape).
2. Import it in `src/loadCommands.ts`.
3. Re-run `pnpm --filter @workspace/discord-bot run deploy-commands`.

## Deployment

`pnpm --filter @workspace/discord-bot run build` bundles the bot to `dist/index.mjs` with esbuild.
`pnpm --filter @workspace/discord-bot run start` runs the built bundle — use this as the production start command.
