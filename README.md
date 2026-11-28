# ASTRA Discord Bot

Discord.js v14 + TypeScript + SQLite (`node:sqlite`, Node 22.5+). Multi-server: every setting is stored per Discord server (guild ID), never shared between servers.

## Commands (36)

| Area | Commands |
|---|---|
| General / utility | `/ping` `/help` `/avatar` `/userinfo` `/serverinfo` `/membercount` `/channelinfo` `/roleinfo` `/emojiinfo` `/botinfo` |
| Fun | `/coinflip` `/dice` `/8ball` `/poll` |
| Moderation | `/kick` `/ban` `/unban` `/timeout` `/untimeout` `/warn` `/warnings` `/clear` `/lock` `/unlock` `/slowmode` `/nick` `/role` |
| Messaging | `/say` `/embed` `/announce` |
| Setup | `/config` `/ticket` `/welcome` `/goodbye` `/verification` `/reactionrole` |

`/help` is generated from the registered commands, so it always matches.

## Setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications) → add a Bot.
2. **Privileged intents** (Bot → Privileged Gateway Intents): enable **Server Members Intent** (join/leave, welcome, goodbye, auto-role) and **Message Content Intent**.
3. Invite with scopes `bot` + `applications.commands` and these permissions (no Administrator needed): View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Add Reactions, Manage Roles, Manage Channels, Manage Messages, Kick Members, Ban Members, Moderate Members, Manage Nicknames.
4. Put the bot's **role above** any role it must hand out (auto-role, verification, reaction roles) in Server Settings → Roles.
5. Environment variables (names only — never commit values): `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, optional `DISCORD_GUILD_ID`.
   **For multiple servers leave `DISCORD_GUILD_ID` empty.** When set, commands are registered in that one server only.
6. `pnpm install`, then `pnpm --filter @workspace/discord-bot run typecheck`, `... run test`, `... run dev`.
   Commands are re-registered automatically on every start; `deploy-commands` runs it standalone.

## Per-server setup (admins)

- **Welcome / Goodbye** — `/welcome setup channel:#welcome [auto_role] [embed_enable] [image_enable] [dm_enable] [title] [description]`, `/goodbye setup …`, `/welcome test`, `/welcome preview`. Placeholders: `{user}` `{username}` `{mention}` `{server}` `{membercount}` `{created}` `{joined}`. Setup refuses channels the bot can't post in and auto-roles it can't assign; custom text can't ping `@everyone`/roles. (Goodbye DMs are best-effort — a member who left usually can't be DMed.)
- **Verification** — `/verification setup channel:#verify role:@Member` posts a button panel; `/verification disable`. Repeated clicks are harmless.
- **Reaction roles** — `/reactionrole add message_id emoji role [channel]`, `remove`, `list`. Survives restarts (stored in SQLite).
- **Tickets** — `/ticket setup category support_role [transcript_channel] [log_channel] …`, then `/ticket panel`. Owner may close their own ticket; only staff (support role / Manage Server / Administrator) can reopen, delete, add/remove users, rename, or get transcripts.
- **Logging** — moderation actions (`/kick /ban /unban /timeout /untimeout /warn`) and ticket/welcome events are posted to the log channel configured for the server. Other log event types (message edit/delete, role/channel changes) are **not wired yet**.
- **Config** — `/config view|export|import|reset`. Import validates every channel/role against *this* server, so an export from another server can be imported safely (missing references are cleared and reported).

## Safety rules enforced in code

- Moderation commands check the invoker's permission, the bot's permission, and role hierarchy; reasons up to 3000 characters (audit log gets the first 512, full text is kept in warnings and the log channel).
- Roles handed out automatically (auto-role, verification, reaction roles) must be below the bot, not managed/@everyone, and must not carry moderator/admin permissions.
- Ticket buttons, modals and commands are authorized server-side on every use.
- Any command still working after 2.5 s is auto-deferred so Discord never shows "The application did not respond".

## Data & persistence

SQLite file at `discord-bot/data/bot.db` (git-ignored). **Replit Autoscale/Reserved deployments do not keep local files between restarts or redeploys** — use a Reserved VM with a persistent disk, or move the database to an external service, before relying on it in production.

## Tests

`pnpm --filter @workspace/discord-bot run test` runs the pure-logic tests (channel/role validation, ticket authorization, config import sanitizing, emoji parsing). They do not talk to Discord.

## Known limitations

- Behaviour that needs a live Discord server (actual permissions, role hierarchy, DMs, reactions) is covered by logic tests only — verify in a test server.
- No automod, leveling, giveaways, custom commands or tournament commands exist yet (database tables for some exist, commands do not).
- `/ticket delete` (slash) deletes without a confirm step; the **Delete** button asks for confirmation.
