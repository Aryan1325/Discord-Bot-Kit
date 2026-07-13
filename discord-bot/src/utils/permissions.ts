import {
  MessageFlags,
  type ChatInputCommandInteraction,
  type GuildMember,
  type PermissionResolvable,
} from "discord.js";
import { createErrorEmbed } from "../embeds/embedBuilder.js";

/**
 * Verifies the invoking member has the given permission. Replies with a
 * standardized error embed and returns `false` if they don't, so callers
 * can `if (!(await ensureMemberPermission(...))) return;`.
 */
export async function ensureMemberPermission(
  interaction: ChatInputCommandInteraction,
  permission: PermissionResolvable,
  label: string,
): Promise<boolean> {
  const member = interaction.member;
  const hasPermission =
    member && "permissions" in member && typeof member.permissions !== "string"
      ? member.permissions.has(permission)
      : false;

  if (!hasPermission) {
    await interaction.reply({
      embeds: [createErrorEmbed(interaction.client, `You need the **${label}** permission to use this command.`)],
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}

/** Verifies the bot itself holds the given permission in this guild. */
export async function ensureBotPermission(
  interaction: ChatInputCommandInteraction,
  permission: PermissionResolvable,
  label: string,
): Promise<boolean> {
  const me = interaction.guild?.members.me;
  if (!me || !me.permissions.has(permission)) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(interaction.client, `I need the **${label}** permission to do that — please grant it to my role.`),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}

/**
 * Checks whether the executor is allowed to target this member: not
 * themself, not the bot, and not someone with an equal/higher role
 * (unless the executor is the server owner). Returns a human-readable
 * reason on failure.
 */
export function checkModerationTarget(
  interaction: ChatInputCommandInteraction,
  targetMember: GuildMember | null,
): { ok: true } | { ok: false; reason: string } {
  const targetId = targetMember?.id;

  if (targetId === interaction.user.id) {
    return { ok: false, reason: "You can't use this command on yourself." };
  }
  if (targetId === interaction.client.user?.id) {
    return { ok: false, reason: "I can't use this command on myself." };
  }

  if (targetMember && interaction.guild) {
    const executor = interaction.member as GuildMember | null;
    const isOwner = interaction.guild.ownerId === interaction.user.id;

    if (executor && !isOwner && targetMember.roles.highest.position >= executor.roles.highest.position) {
      return { ok: false, reason: "You can't moderate someone with an equal or higher role than you." };
    }
  }

  return { ok: true };
}
