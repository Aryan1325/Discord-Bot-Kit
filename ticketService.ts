import {
  AttachmentBuilder,
  ChannelType,
  Colors,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { botConfig } from "../config/botConfig.js";
import {
  countOpenTicketsForUser,
  createTicket,
  deleteTicketRecord,
  getTicketByChannelId,
  getTicketSettings,
  markTicketClosed,
  markTicketReopened,
  setTicketTranscriptUrl,
  type TicketRecord,
} from "../database/repositories.js";
import { DatabaseError, PermissionError } from "../errors/BotError.js";
import { LogEventType } from "../logging/types.js";
import { dispatchTicketLog } from "./ticketLogger.js";
import { buildTicketControlButtons } from "./panel.js";
import { fetchTranscriptMessages, generateTranscriptHtml } from "./transcript.js";
import { fetchGuildChannel } from "../utils/validation.js";
import { canPerformTicketAction, type TicketAction } from "./authorization.js";
import { TICKET_TYPE_EMOJIS, TICKET_TYPE_LABELS, type TicketType } from "./types.js";

function sanitizeForChannelName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function formatTicketName(format: string, member: GuildMember, type: TicketType): string {
  const filled = format
    .replaceAll("{username}", member.user.username)
    .replaceAll("{type}", type)
    .replaceAll("{id}", member.id);
  const safe = sanitizeForChannelName(filled);
  return safe || `ticket-${member.id}`;
}

/**
 * Creates a new ticket channel for `member`, enforcing per-guild setup and
 * the configured max-open-tickets limit. Throws `PermissionError`/
 * `DatabaseError` on failure so callers can surface a branded message.
 */
export async function openTicket(guild: Guild, member: GuildMember, type: TicketType): Promise<{ channel: TextChannel; ticket: TicketRecord }> {
  const settings = getTicketSettings(guild.id);

  if (!settings?.enabled || !settings.categoryId || !settings.supportRoleId) {
    throw new PermissionError("The ticket system hasn't been configured yet. An admin needs to run `/ticket setup` first.");
  }

  const maxOpen = settings.maxOpenTickets;
  if (maxOpen > 0) {
    const openCount = countOpenTicketsForUser(guild.id, member.id);
    if (openCount >= maxOpen) {
      throw new PermissionError(`You already have ${openCount} open ticket(s), which is the limit for this server. Please close one before opening another.`);
    }
  }

  const category = await guild.channels.fetch(settings.categoryId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    throw new DatabaseError("The configured ticket category no longer exists. Please run `/ticket setup` again.");
  }

  const supportRole = await guild.roles.fetch(settings.supportRoleId).catch(() => null);
  if (!supportRole) {
    throw new DatabaseError("The configured support role no longer exists. An admin needs to run `/ticket setup` again.");
  }

  const channelName = formatTicketName(settings.ticketNameFormat, member, type);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Ticket owner: ${member.id} • Type: ${type}`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: member.id,
        type: OverwriteType.Member,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
      },
      {
        id: settings.supportRoleId,
        type: OverwriteType.Role,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
      },
      ...(guild.members.me
        ? [
            {
              id: guild.members.me.id,
              type: OverwriteType.Member,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AttachFiles,
              ],
            },
          ]
        : []),
    ],
  });

  // Administrators already see every channel via the Administrator
  // permission, so no explicit overwrite is needed for that role — adding
  // one would require guessing which role(s) count as "admin".

  const ticket = createTicket({ guildId: guild.id, channelId: channel.id, ownerId: member.id, type });

  const welcomeEmbed = createEmbed({
    client: guild.client,
    title: `${TICKET_TYPE_EMOJIS[type]} ${TICKET_TYPE_LABELS[type]} Ticket`,
    description:
      `Thanks for reaching out, ${member.user}! Support will be with you shortly.\n\n` +
      "Please describe your issue in as much detail as possible while you wait.",
    color: botConfig.colors.primary,
    fields: [
      { name: "Opened By", value: `${member.user}`, inline: true },
      { name: "Category", value: TICKET_TYPE_LABELS[type], inline: true },
    ],
  });

  await channel.send({
    content: `${member.user} • <@&${settings.supportRoleId}>`,
    embeds: [welcomeEmbed],
    components: buildTicketControlButtons("open"),
  });

  await dispatchTicketLog(guild.client, guild.id, LogEventType.TicketCreated, {
    description: `Ticket **#${channel.name}** was opened.`,
    fields: [
      { name: "Owner", value: `${member.user}`, inline: true },
      { name: "Category", value: TICKET_TYPE_LABELS[type], inline: true },
    ],
  });

  return { channel, ticket };
}

/** Resolves the ticket bound to a channel, or `null` if the channel isn't a ticket. */
export function resolveTicketChannel(channelId: string): TicketRecord | null {
  return getTicketByChannelId(channelId);
}

/** Closes a ticket: revokes the owner's send permission and swaps the control buttons to "Reopen". */
export async function closeTicket(channel: TextChannel, ticket: TicketRecord, closedBy: string): Promise<void> {
  await channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: false }).catch(() => undefined);
  markTicketClosed(channel.id, closedBy);

  await channel.send({
    embeds: [
      createEmbed({
        client: channel.client,
        title: "🔒 Ticket Closed",
        description: `This ticket was closed by <@${closedBy}>. Staff can reopen it, generate a transcript, or delete the channel.`,
        color: Colors.Red,
      }),
    ],
    components: buildTicketControlButtons("closed"),
  });

  await dispatchTicketLog(channel.client, ticket.guildId, LogEventType.TicketClosed, {
    description: `Ticket **#${channel.name}** was closed by <@${closedBy}>.`,
  });
}

/** Reopens a previously closed ticket. */
export async function reopenTicket(channel: TextChannel, ticket: TicketRecord, reopenedBy: string): Promise<void> {
  await channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: true }).catch(() => undefined);
  markTicketReopened(channel.id);

  await channel.send({
    embeds: [
      createEmbed({
        client: channel.client,
        title: "🔓 Ticket Reopened",
        description: `This ticket was reopened by <@${reopenedBy}>.`,
        color: botConfig.colors.success,
      }),
    ],
    components: buildTicketControlButtons("open"),
  });

  await dispatchTicketLog(channel.client, ticket.guildId, LogEventType.TicketClosed, {
    description: `Ticket **#${channel.name}** was reopened by <@${reopenedBy}>.`,
  });
}

/** Generates and delivers an HTML transcript to the configured transcript channel and the ticket owner's DMs. */
export async function generateAndDeliverTranscript(
  channel: TextChannel,
  ticket: TicketRecord,
  requestedBy: string,
): Promise<{ attachment: AttachmentBuilder; deliveredToChannel: boolean; deliveredToDm: boolean }> {
  const messages = await fetchTranscriptMessages(channel);
  const html = generateTranscriptHtml(channel.name, messages);
  const buffer = Buffer.from(html, "utf-8");
  const fileName = `transcript-${channel.name}.html`;

  const settings = getTicketSettings(ticket.guildId);
  let deliveredToChannel = false;
  let deliveredToDm = false;
  let transcriptUrl: string | null = null;

  if (settings?.transcriptChannelId) {
    const transcriptChannel = await fetchGuildChannel(channel.guild, settings.transcriptChannelId);
    if (transcriptChannel && transcriptChannel.isTextBased()) {
      const sent = await transcriptChannel
        .send({
          content: `Transcript for **#${channel.name}** (requested by <@${requestedBy}>)`,
          files: [new AttachmentBuilder(buffer, { name: fileName })],
        })
        .catch(() => null);
      if (sent) {
        deliveredToChannel = true;
        transcriptUrl = sent.attachments.first()?.url ?? null;
      }
    }
  }

  const owner = await channel.client.users.fetch(ticket.ownerId).catch(() => null);
  if (owner) {
    const dmSent = await owner
      .send({
        content: `Here is the transcript for your ticket **#${channel.name}** in **${channel.guild.name}**.`,
        files: [new AttachmentBuilder(buffer, { name: fileName })],
      })
      .catch(() => null);
    deliveredToDm = Boolean(dmSent);
  }

  if (transcriptUrl) {
    setTicketTranscriptUrl(channel.id, transcriptUrl);
  }

  await dispatchTicketLog(channel.client, ticket.guildId, LogEventType.TicketTranscriptGenerated, {
    description: `A transcript for **#${channel.name}** was generated by <@${requestedBy}>.`,
  });

  return { attachment: new AttachmentBuilder(buffer, { name: fileName }), deliveredToChannel, deliveredToDm };
}

/** Deletes a ticket channel entirely, after logging and clearing its DB record. */
export async function deleteTicket(channel: TextChannel, ticket: TicketRecord, deletedBy: string): Promise<void> {
  await dispatchTicketLog(channel.client, ticket.guildId, LogEventType.TicketDeleted, {
    description: `Ticket **#${channel.name}** was deleted by <@${deletedBy}>.`,
  });
  deleteTicketRecord(channel.id);
  await channel.delete(`Ticket deleted by ${deletedBy}`).catch(() => undefined);
}

/** Renames a ticket channel and logs the change. */
export async function renameTicket(channel: TextChannel, ticket: TicketRecord, newName: string, renamedBy: string): Promise<string> {
  const safeName = sanitizeForChannelName(newName) || channel.name;
  const oldName = channel.name;
  await channel.setName(safeName, `Renamed by ${renamedBy}`);

  await dispatchTicketLog(channel.client, ticket.guildId, LogEventType.TicketRenamed, {
    description: `Ticket **#${oldName}** was renamed to **#${safeName}** by <@${renamedBy}>.`,
  });

  return safeName;
}

/** Adds a member to a ticket channel's permission overwrites. */
export async function addUserToTicket(channel: TextChannel, ticket: TicketRecord, member: GuildMember, addedBy: string): Promise<void> {
  await channel.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  await dispatchTicketLog(channel.client, ticket.guildId, LogEventType.TicketMembersAdded, {
    description: `<@${member.id}> was added to ticket **#${channel.name}** by <@${addedBy}>.`,
  });
}

/** Removes a member from a ticket channel's permission overwrites. */
export async function removeUserFromTicket(channel: TextChannel, ticket: TicketRecord, member: GuildMember, removedBy: string): Promise<void> {
  await channel.permissionOverwrites.delete(member.id).catch(() => undefined);

  await dispatchTicketLog(channel.client, ticket.guildId, LogEventType.TicketMembersRemoved, {
    description: `<@${member.id}> was removed from ticket **#${channel.name}** by <@${removedBy}>.`,
  });
}

/** Is this member support staff? (configured support role, Manage Server, or Administrator.) */
export function isTicketStaff(member: GuildMember | null, supportRoleId: string | null): boolean {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return Boolean(supportRoleId && member.roles.cache.has(supportRoleId));
}

type TicketInteraction = ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction;

/**
 * Resolves the ticket for this channel AND verifies, server-side, that the
 * invoking user may perform `action` on it. Replies with a clear error and
 * returns null otherwise. Never trusts custom IDs or which buttons were visible.
 */
export async function requireTicketPermission(interaction: TicketInteraction, action: TicketAction): Promise<TicketRecord | null> {
  const ticket = await requireTicketChannel(interaction);
  if (!ticket) return null;

  const deny = async (reason: string) => {
    await interaction.reply({ embeds: [createErrorEmbed(interaction.client, reason)], flags: MessageFlags.Ephemeral });
    return null;
  };

  // A ticket record only counts inside the server that created it.
  if (!interaction.guild || ticket.guildId !== interaction.guild.id) return deny("This ticket doesn't belong to this server.");

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  const settings = getTicketSettings(interaction.guild.id);
  const result = canPerformTicketAction(action, {
    userId: interaction.user.id,
    ownerId: ticket.ownerId,
    isStaff: isTicketStaff(member, settings?.supportRoleId ?? null),
  });
  if (!result.allowed) return deny(result.reason);
  return ticket;
}

/** Shared guard used by every ticket-scoped slash command and button: resolves the ticket or replies with an error. */
export async function requireTicketChannel(
  interaction: TicketInteraction,
): Promise<TicketRecord | null> {
  const channelId = interaction.channelId;
  const ticket = resolveTicketChannel(channelId);

  if (!ticket) {
    await interaction.reply({
      embeds: [createErrorEmbed(interaction.client, "This command can only be used inside a ticket channel.")],
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  return ticket;
}

export { createSuccessEmbed };
