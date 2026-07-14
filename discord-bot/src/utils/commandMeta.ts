/**
 * Extra metadata shown in the /help menu (usage string, example, and
 * required permission) for every command. Commands not listed here just
 * show their slash-command description with no usage/example/permission
 * lines — but every command should have an entry for a complete menu.
 */
export interface CommandMeta {
  usage: string;
  example: string;
  permission: string;
}

export const commandMeta: Record<string, CommandMeta> = {
  // General
  help: { usage: "/help", example: "/help", permission: "None" },
  avatar: { usage: "/avatar [user]", example: "/avatar user:@Player1", permission: "None" },

  // Utility
  ping: { usage: "/ping", example: "/ping", permission: "None" },
  userinfo: { usage: "/userinfo [user]", example: "/userinfo user:@Player1", permission: "None" },
  serverinfo: { usage: "/serverinfo", example: "/serverinfo", permission: "None" },
  say: { usage: "/say message:<text>", example: "/say message:GG everyone!", permission: "Manage Messages" },
  embed: {
    usage: "/embed title:<text> description:<text> color:<#hex> thumbnail_url:<url> image_url:<url> banner_url:<url> footer:<text> footer_icon_url:<url>",
    example: "/embed title:Welcome description:Glad to have you here! color:#00E5FF",
    permission: "Manage Messages",
  },
  poll: { usage: "/poll question:<text>", example: "/poll question:Best map tonight?", permission: "None" },
  announce: {
    usage: "/announce message:<text> everyone:<true|false> here:<true|false> thumbnail_url:<url> image_url:<url> banner_url:<url>",
    example: "/announce message:Scrims start in 10 minutes! everyone:true",
    permission: "Manage Guild",
  },
  slowmode: { usage: "/slowmode seconds:<0-21600>", example: "/slowmode seconds:10", permission: "Manage Channels" },
  ticket: {
    usage: "/ticket <setup|panel|close|reopen|delete|add|remove|rename|transcript>",
    example: "/ticket panel channel:#support",
    permission: "Manage Server (setup/panel) — varies by subcommand",
  },
  lock: { usage: "/lock", example: "/lock", permission: "Manage Channels" },
  unlock: { usage: "/unlock", example: "/unlock", permission: "Manage Channels" },

  // Moderation
  kick: { usage: "/kick user:<@member> reason:<text>", example: "/kick user:@Player1 reason:Spamming", permission: "Kick Members" },
  ban: {
    usage: "/ban user:<@user> reason:<text> delete_days:<0-7>",
    example: "/ban user:@Player1 reason:Cheating delete_days:1",
    permission: "Ban Members",
  },
  unban: { usage: "/unban user_id:<id> reason:<text>", example: "/unban user_id:123456789012345678 reason:Appeal accepted", permission: "Ban Members" },
  timeout: {
    usage: "/timeout user:<@member> minutes:<1-40320> reason:<text>",
    example: "/timeout user:@Player1 minutes:10 reason:Cooling off",
    permission: "Timeout Members",
  },
  untimeout: { usage: "/untimeout user:<@member> reason:<text>", example: "/untimeout user:@Player1 reason:Timeout expired early", permission: "Timeout Members" },
  warn: { usage: "/warn user:<@member> reason:<text>", example: "/warn user:@Player1 reason:Toxic chat", permission: "Timeout Members" },
  warnings: { usage: "/warnings [user]", example: "/warnings user:@Player1", permission: "Timeout Members" },
  clear: { usage: "/clear amount:<1-100> [user]", example: "/clear amount:20 user:@Player1", permission: "Manage Messages" },

  // Fun
  coinflip: { usage: "/coinflip", example: "/coinflip", permission: "None" },
  dice: { usage: "/dice", example: "/dice", permission: "None" },
  "8ball": { usage: "/8ball question:<text>", example: "/8ball question:Will we win tonight?", permission: "None" },

  // Admin
  nick: {
    usage: "/nick user:<@member> [nickname]",
    example: "/nick user:@Player1 nickname:MVP",
    permission: "Manage Nicknames",
  },
  role: {
    usage: "/role user:<@member> role:<@role> action:<add|remove>",
    example: "/role user:@Player1 role:@Verified action:add",
    permission: "Manage Roles",
  },
  membercount: { usage: "/membercount", example: "/membercount", permission: "None" },
  channelinfo: { usage: "/channelinfo [channel]", example: "/channelinfo channel:#general", permission: "None" },
  roleinfo: { usage: "/roleinfo role:<@role>", example: "/roleinfo role:@Verified", permission: "None" },
  emojiinfo: { usage: "/emojiinfo", example: "/emojiinfo", permission: "None" },
  botinfo: { usage: "/botinfo", example: "/botinfo", permission: "None" },
  config: {
    usage: "/config <view|reset|export|import>",
    example: "/config view",
    permission: "Manage Guild",
  },
};
