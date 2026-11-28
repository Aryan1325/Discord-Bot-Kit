import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type PermissionResolvable,
  type Role,
} from "discord.js";

/** Result of a validation check: either the validated value, or a user-safe reason it failed. */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export interface ChannelCheckOptions {
  /** The bot will post embeds here (requires Embed Links). */
  embeds?: boolean;
  /** The bot will upload files here (requires Attach Files). */
  attachments?: boolean;
  /** Accept threads as well as text/announcement channels. */
  allowThreads?: boolean;
}

const TEXT_CHANNEL_TYPES: ReadonlySet<ChannelType> = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);
const THREAD_CHANNEL_TYPES: ReadonlySet<ChannelType> = new Set([
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
]);

/** "SendMessages" -> "Send Messages". */
function humanizePermission(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Resolves a channel ID inside one specific guild. Never returns a channel belonging to another server. */
export async function fetchGuildChannel(guild: Guild, channelId: string): Promise<GuildBasedChannel | null> {
  const cached = guild.channels.cache.get(channelId);
  if (cached) return cached;
  return (await guild.channels.fetch(channelId).catch(() => null)) ?? null;
}

/**
 * Checks that `channel` belongs to `guild`, is a channel the bot can post in,
 * and that the bot's *effective* permissions there (including channel
 * overwrites — so private channels work when the bot has been granted access)
 * cover everything it needs.
 */
export function validateSendableChannel(
  guild: Guild,
  channel: GuildBasedChannel | null | undefined,
  options: ChannelCheckOptions = {},
): ValidationResult<GuildBasedChannel> {
  if (!channel) return { ok: false, reason: "That channel no longer exists." };
  if (channel.guildId !== guild.id) return { ok: false, reason: "That channel belongs to a different server." };

  const isThread = THREAD_CHANNEL_TYPES.has(channel.type);
  if (!TEXT_CHANNEL_TYPES.has(channel.type) && !(options.allowThreads && isThread)) {
    return { ok: false, reason: "That isn't a text channel I can post messages in." };
  }

  const me = guild.members.me;
  if (!me) return { ok: false, reason: "I couldn't determine my own permissions in this server." };

  const required: PermissionResolvable[] = [
    PermissionFlagsBits.ViewChannel,
    isThread ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages,
  ];
  if (options.embeds) required.push(PermissionFlagsBits.EmbedLinks);
  if (options.attachments) required.push(PermissionFlagsBits.AttachFiles);

  const permissions = channel.permissionsFor(me);
  if (!permissions) return { ok: false, reason: "I couldn't determine my permissions in that channel." };

  const missing = permissions.missing(required);
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `I'm missing these permissions in <#${channel.id}>: ${missing.map(humanizePermission).join(", ")}.`,
    };
  }

  return { ok: true, value: channel };
}

/** Permissions that make a role unsafe to hand out automatically (anyone who clicks/joins would gain them). */
const PRIVILEGED_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.MentionEveryone,
];

export interface RoleCheckOptions {
  /** Reject roles carrying moderator/admin permissions. Use for anything self-service or automatic (auto-role, verification, reaction roles). */
  rejectPrivileged?: boolean;
  /** When set, the role must also be below this member's highest role (unless they own the server). */
  executor?: GuildMember | null;
}

/**
 * Checks that the bot can actually hand out `role`: it exists, isn't
 * @everyone or an integration-managed role, the bot has Manage Roles, and the
 * role sits below the bot's highest role. Optionally also enforces that the
 * invoking member could not use this to escalate beyond their own role.
 */
export function validateAssignableRole(
  guild: Guild,
  role: Role | null | undefined,
  options: RoleCheckOptions = {},
): ValidationResult<Role> {
  if (!role) return { ok: false, reason: "That role no longer exists." };
  if (role.guild.id !== guild.id) return { ok: false, reason: "That role belongs to a different server." };
  if (role.id === guild.id) return { ok: false, reason: "The @everyone role can't be assigned." };
  if (role.managed) return { ok: false, reason: `${role.name} is managed by an integration and can't be assigned manually.` };

  const me = guild.members.me;
  if (!me) return { ok: false, reason: "I couldn't determine my own roles in this server." };
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, reason: "I need the Manage Roles permission to assign roles." };
  }
  if (role.position >= me.roles.highest.position) {
    return { ok: false, reason: `${role.name} is higher than (or equal to) my highest role — move my role above it in Server Settings → Roles.` };
  }

  if (options.rejectPrivileged && role.permissions.any(PRIVILEGED_PERMISSIONS)) {
    return { ok: false, reason: `${role.name} has moderator/admin permissions, so it can't be handed out automatically.` };
  }

  const executor = options.executor;
  if (executor && guild.ownerId !== executor.id && role.position >= executor.roles.highest.position) {
    return { ok: false, reason: `You can't configure ${role.name} because it is higher than (or equal to) your own highest role.` };
  }

  return { ok: true, value: role };
}
