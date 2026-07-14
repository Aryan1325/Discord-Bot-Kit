import type { Guild, GuildMember } from "discord.js";

/**
 * Shared placeholder vocabulary for welcome/goodbye titles, descriptions,
 * and legacy plain-text messages. Applied with a simple string-replace
 * pass so authors can freely mix and repeat placeholders.
 */
export function applyPlaceholders(template: string, member: GuildMember, guild: Guild): string {
  const joined = member.joinedAt ?? new Date(member.joinedTimestamp ?? Date.now());

  return template
    .replaceAll("{user}", `${member.user}`)
    .replaceAll("{mention}", `${member.user}`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", guild.name)
    .replaceAll("{membercount}", `${guild.memberCount}`)
    .replaceAll("{created}", `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`)
    .replaceAll("{joined}", `<t:${Math.floor(joined.getTime() / 1000)}:D>`);
}

export const PLACEHOLDER_HELP =
  "`{user}` `{username}` `{mention}` `{server}` `{membercount}` `{created}` `{joined}`";
