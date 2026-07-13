/**
 * Extra metadata shown in the /help menu (usage string + required
 * permission) for commands where the bare description isn't enough
 * context — primarily Moderation and Utility commands with options.
 * Commands not listed here just show their slash-command description.
 */
export interface CommandMeta {
  usage: string;
  permission: string;
}

export const commandMeta: Record<string, CommandMeta> = {
  say: { usage: "/say message:<text>", permission: "Manage Messages" },
  embed: {
    usage: "/embed title:<text> description:<text> color:<#hex> thumbnail_url:<url> image_url:<url> banner_url:<url> footer:<text> footer_icon_url:<url>",
    permission: "Manage Messages",
  },
  poll: { usage: "/poll question:<text>", permission: "None" },
  announce: {
    usage: "/announce message:<text> everyone:<true|false> here:<true|false> thumbnail_url:<url> image_url:<url> banner_url:<url>",
    permission: "Manage Guild",
  },
  slowmode: { usage: "/slowmode seconds:<0-21600>", permission: "Manage Channels" },
  lock: { usage: "/lock", permission: "Manage Channels" },
  unlock: { usage: "/unlock", permission: "Manage Channels" },
  kick: { usage: "/kick user:<@member> reason:<text>", permission: "Kick Members" },
  ban: { usage: "/ban user:<@user> reason:<text> delete_days:<0-7>", permission: "Ban Members" },
  unban: { usage: "/unban user_id:<id> reason:<text>", permission: "Ban Members" },
  timeout: { usage: "/timeout user:<@member> minutes:<1-40320> reason:<text>", permission: "Timeout Members" },
  untimeout: { usage: "/untimeout user:<@member> reason:<text>", permission: "Timeout Members" },
  warn: { usage: "/warn user:<@member> reason:<text>", permission: "Timeout Members" },
  warnings: { usage: "/warnings user:<@member>", permission: "Timeout Members" },
  clear: { usage: "/clear amount:<1-100> user:<@user>", permission: "Manage Messages" },
};
