import type { GuildMember } from "discord.js";
import { getGoodbyeSettings, getWelcomeSettings } from "../database/repositories.js";
import { dispatchLog, LogEventType } from "../logging/logger.js";
import { logError } from "../errors/errorHandler.js";
import { generateMemberCard } from "./card.js";
import { buildCardAttachment, buildMemberEmbed } from "./embeds.js";
import { applyPlaceholders } from "./placeholders.js";

/** Sends the configured welcome message/embed/image, assigns the auto-role, and optionally DMs the member. */
export async function handleMemberJoin(member: GuildMember): Promise<void> {
  const guild = member.guild;
  const settings = getWelcomeSettings(guild.id);
  if (!settings?.enabled) return;

  if (settings.channelId) {
    await deliverToChannel({
      channelId: settings.channelId,
      kind: "welcome",
      member,
      embedEnabled: settings.embedEnabled,
      imageEnabled: settings.imageEnabled,
      title: settings.title,
      description: settings.description,
      message: settings.message,
    });
  }

  if (settings.autoRoleId) {
    await assignAutoRole(member, settings.autoRoleId);
  }

  if (settings.dmEnabled) {
    await sendDm(member, "welcome", settings.title, settings.description, settings.message);
  }
}

/** Sends the configured goodbye message/embed/image and optionally DMs the member (best-effort — they may already be gone). */
export async function handleMemberLeave(member: GuildMember): Promise<void> {
  const guild = member.guild;
  const settings = getGoodbyeSettings(guild.id);
  if (!settings?.enabled) return;

  if (settings.channelId) {
    await deliverToChannel({
      channelId: settings.channelId,
      kind: "goodbye",
      member,
      embedEnabled: settings.embedEnabled,
      imageEnabled: settings.imageEnabled,
      title: settings.title,
      description: settings.description,
      message: settings.message,
    });
  }

  if (settings.dmEnabled) {
    await sendDm(member, "goodbye", settings.title, settings.description, settings.message);
  }
}

interface DeliverOptions {
  channelId: string;
  kind: "welcome" | "goodbye";
  member: GuildMember;
  embedEnabled: boolean;
  imageEnabled: boolean;
  title: string | null;
  description: string | null;
  message: string | null;
}

async function deliverToChannel(options: DeliverOptions): Promise<void> {
  const { channelId, kind, member, embedEnabled, imageEnabled, title, description, message } = options;
  const guild = member.guild;

  try {
    const channel = await member.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !("send" in channel) || typeof channel.send !== "function") {
      logError(`WELCOME_GOODBYE:${kind}`, `Configured channel ${channelId} no longer exists or isn't sendable in guild ${guild.id}.`);
      return;
    }

    const files = [];
    let imageAttachmentName: string | undefined;

    if (imageEnabled) {
      const buffer = await generateMemberCard(member, guild, kind === "welcome" ? "join" : "leave");
      const attachment = buildCardAttachment(buffer, kind);
      files.push(attachment);
      imageAttachmentName = attachment.name ?? undefined;
    }

    if (embedEnabled) {
      const embed = buildMemberEmbed({
        client: member.client,
        member,
        guild,
        kind,
        settings: { title, description },
        imageAttachmentName,
      });
      await channel.send({ embeds: [embed], files });
    } else {
      const plainText = message?.trim() ? applyPlaceholders(message, member, guild) : applyPlaceholders(getPlainDefault(kind), member, guild);
      await channel.send({ content: plainText, files });
    }

    await dispatchLog(member.client, guild.id, kind === "welcome" ? LogEventType.WelcomeSent : LogEventType.GoodbyeSent, {
      description: `${kind === "welcome" ? "Welcome" : "Goodbye"} message sent for ${member.user.tag} in <#${channelId}>.`,
    });
  } catch (error) {
    logError(`WELCOME_GOODBYE:${kind}`, error);
  }
}

function getPlainDefault(kind: "welcome" | "goodbye"): string {
  return kind === "welcome" ? "👋 Welcome {mention} to **{server}**! You are member #{membercount}." : "👋 **{username}** has left **{server}**.";
}

async function assignAutoRole(member: GuildMember, roleId: string): Promise<void> {
  try {
    const role = await member.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      logError("AUTO_ROLE", `Configured auto-role ${roleId} no longer exists in guild ${member.guild.id}.`);
      return;
    }

    const me = member.guild.members.me;
    if (!me?.permissions.has("ManageRoles") || role.position >= (me.roles.highest.position ?? 0)) {
      logError("AUTO_ROLE", `Missing permission or role hierarchy to assign ${roleId} in guild ${member.guild.id}.`);
      return;
    }

    await member.roles.add(role, "Auto-role on join");

    await dispatchLog(member.client, member.guild.id, LogEventType.AutoRoleGiven, {
      description: `Auto-role ${role} was given to ${member.user.tag}.`,
    });
  } catch (error) {
    logError("AUTO_ROLE", error);
  }
}

async function sendDm(
  member: GuildMember,
  kind: "welcome" | "goodbye",
  title: string | null,
  description: string | null,
  message: string | null,
): Promise<void> {
  try {
    const embed = buildMemberEmbed({
      client: member.client,
      member,
      guild: member.guild,
      kind,
      settings: { title, description },
    });
    await member.send({ embeds: [embed] });
  } catch (error) {
    logError(`DM_${kind.toUpperCase()}`, error);
    await dispatchLog(member.client, member.guild.id, LogEventType.DmFailed, {
      description: `Failed to DM ${kind} message to ${member.user.tag} — their DMs are likely closed.`,
    }).catch(() => undefined);
  }
}
