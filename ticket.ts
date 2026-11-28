import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type TextChannel,
} from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";
import { upsertTicketSettings, getTicketSettings } from "../database/repositories.js";
import { invalidateGuildCache } from "../cache/settingsCache.js";
import { buildTicketPanelButtons, buildTicketPanelEmbed } from "../tickets/panel.js";
import {
  addUserToTicket,
  closeTicket,
  deleteTicket,
  generateAndDeliverTranscript,
  removeUserFromTicket,
  renameTicket,
  reopenTicket,
  requireTicketPermission,
} from "../tickets/ticketService.js";
import type { TicketAction } from "../tickets/authorization.js";
import { fetchGuildChannel, validateSendableChannel } from "../utils/validation.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage the AK ESPORTS support ticket system.")
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Configure the ticket system for this server.")
        .addChannelOption((opt) => opt.setName("category").setDescription("Category new ticket channels are created under.").addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        .addRoleOption((opt) => opt.setName("support_role").setDescription("Role that can see and manage every ticket.").setRequired(true))
        .addChannelOption((opt) => opt.setName("transcript_channel").setDescription("Channel transcripts are posted to.").addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addChannelOption((opt) => opt.setName("log_channel").setDescription("Channel ticket activity is logged to.").addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addIntegerOption((opt) => opt.setName("max_open_tickets").setDescription("Max open tickets per user (0 = unlimited). Default 0.").setMinValue(0).setMaxValue(50).setRequired(false))
        .addStringOption((opt) =>
          opt
            .setName("ticket_name_format")
            .setDescription("Channel name format. Use {username}, {type}, {id}. Default: ticket-{username}")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Post the ticket panel in this (or another) channel.")
        .addChannelOption((opt) => opt.setName("channel").setDescription("Channel to post the panel in. Defaults to this channel.").addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addStringOption((opt) => opt.setName("banner_url").setDescription("Optional banner image URL for the panel.").setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("close").setDescription("Close this ticket."))
    .addSubcommand((sub) => sub.setName("reopen").setDescription("Reopen this ticket."))
    .addSubcommand((sub) => sub.setName("delete").setDescription("Permanently delete this ticket channel."))
    .addSubcommand((sub) =>
      sub.setName("add").setDescription("Add a user to this ticket.").addUserOption((opt) => opt.setName("user").setDescription("User to add.").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName("remove").setDescription("Remove a user from this ticket.").addUserOption((opt) => opt.setName("user").setDescription("User to remove.").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub.setName("rename").setDescription("Rename this ticket channel.").addStringOption((opt) => opt.setName("name").setDescription("New channel name.").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("transcript").setDescription("Generate and deliver a transcript for this ticket."))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);
    const guildId = interaction.guild.id;

    if (subcommand === "setup") {
      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;
      if (!(await ensureBotPermission(interaction, PermissionFlagsBits.ManageChannels, "Manage Channels"))) return;

      const category = interaction.options.getChannel("category", true);
      const supportRole = interaction.options.getRole("support_role", true);
      const transcriptChannel = interaction.options.getChannel("transcript_channel", false);
      const logChannel = interaction.options.getChannel("log_channel", false);
      const maxOpenTickets = interaction.options.getInteger("max_open_tickets", false);
      const ticketNameFormat = interaction.options.getString("ticket_name_format", false);

      // Validate every reference BEFORE saving, so a broken config is never persisted.
      const guild = interaction.guild;
      const me = guild.members.me;
      const categoryChannel = await fetchGuildChannel(guild, category.id);
      if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory || categoryChannel.guildId !== guild.id) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "The ticket category must be a category channel in this server.")], flags: MessageFlags.Ephemeral });
        return;
      }
      const categoryMissing = me ? categoryChannel.permissionsFor(me)?.missing([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]) ?? [] : [];
      if (categoryMissing.length) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, `I'm missing these permissions in that category: ${categoryMissing.join(", ")}.`)], flags: MessageFlags.Ephemeral });
        return;
      }
      // The support role is allowed to be a staff role, but it must be a real, normal role of this server.
      if (supportRole.id === guild.id || guild.roles.cache.get(supportRole.id)?.managed || !guild.roles.cache.has(supportRole.id)) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "Pick a normal role of this server as the support role (not @everyone or an integration role).")], flags: MessageFlags.Ephemeral });
        return;
      }
      for (const [label, option, attachments] of [["Transcript channel", transcriptChannel, true], ["Log channel", logChannel, false]] as const) {
        if (!option) continue;
        const check = validateSendableChannel(guild, await fetchGuildChannel(guild, option.id), { embeds: true, attachments });
        if (!check.ok) {
          await interaction.reply({ embeds: [createErrorEmbed(interaction.client, `${label}: ${check.reason}`)], flags: MessageFlags.Ephemeral });
          return;
        }
      }

      const settings = upsertTicketSettings(guildId, {
        enabled: true,
        categoryId: category.id,
        supportRoleId: supportRole.id,
        transcriptChannelId: transcriptChannel?.id ?? null,
        logChannelId: logChannel?.id ?? null,
        ...(maxOpenTickets !== null ? { maxOpenTickets } : {}),
        ...(ticketNameFormat ? { ticketNameFormat } : {}),
      });
      invalidateGuildCache(guildId);

      const embed = createSuccessEmbed(interaction.client, "Ticket system configured successfully.");
      embed.addFields(
        { name: "Category", value: `<#${settings.categoryId}>`, inline: true },
        { name: "Support Role", value: `<@&${settings.supportRoleId}>`, inline: true },
        { name: "Transcript Channel", value: settings.transcriptChannelId ? `<#${settings.transcriptChannelId}>` : "Not set", inline: true },
        { name: "Log Channel", value: settings.logChannelId ? `<#${settings.logChannelId}>` : "Not set", inline: true },
        { name: "Max Open Tickets", value: settings.maxOpenTickets === 0 ? "Unlimited" : `${settings.maxOpenTickets}`, inline: true },
        { name: "Name Format", value: `\`${settings.ticketNameFormat}\``, inline: true },
      );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "panel") {
      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

      const settings = getTicketSettings(guildId);
      if (!settings?.enabled) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, "Run `/ticket setup` before posting a panel.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const requested = interaction.options.getChannel("channel", false);
      const panelCheck = validateSendableChannel(
        interaction.guild,
        await fetchGuildChannel(interaction.guild, requested?.id ?? interaction.channelId),
        { embeds: true },
      );
      if (!panelCheck.ok) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, panelCheck.reason)], flags: MessageFlags.Ephemeral });
        return;
      }
      const targetChannel = panelCheck.value as TextChannel;
      const bannerUrl = interaction.options.getString("banner_url", false);

      const embed = buildTicketPanelEmbed(interaction.client, bannerUrl);
      const rows = buildTicketPanelButtons();

      await targetChannel.send({ embeds: [embed], components: rows });
      await interaction.reply({
        embeds: [createSuccessEmbed(interaction.client, `Ticket panel posted in ${targetChannel}.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Every remaining subcommand operates on the channel the command was run in,
    // and is authorized server-side (not just by the command's default permissions).
    const actionBySubcommand: Record<string, TicketAction> = {
      close: "close", reopen: "reopen", delete: "delete", add: "add_user", remove: "remove_user", rename: "rename", transcript: "transcript",
    };
    const ticket = await requireTicketPermission(interaction, actionBySubcommand[subcommand] ?? "delete");
    if (!ticket) return;

    const channel = interaction.channel as TextChannel;

    if (subcommand === "close") {
      if (ticket.status === "closed") {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "This ticket is already closed.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await closeTicket(channel, ticket, interaction.user.id);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "Ticket closed.")], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "reopen") {
      if (ticket.status === "open") {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "This ticket is already open.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await reopenTicket(channel, ticket, interaction.user.id);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "Ticket reopened.")], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "delete") {
      await interaction.reply({
        embeds: [createEmbed({ client: interaction.client, title: "🗑 Deleting Ticket", description: "This channel will be deleted in a few seconds." })],
      });
      await deleteTicket(channel, ticket, interaction.user.id);
      return;
    }

    if (subcommand === "add") {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "Couldn't find that member in this server.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await addUserToTicket(channel, ticket, member, interaction.user.id);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, `${user} was added to this ticket.`)] });
      return;
    }

    if (subcommand === "remove") {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "Couldn't find that member in this server.")], flags: MessageFlags.Ephemeral });
        return;
      }
      if (member.id === ticket.ownerId) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "You can't remove the ticket owner. Use `/ticket delete` instead.")], flags: MessageFlags.Ephemeral });
        return;
      }
      await removeUserFromTicket(channel, ticket, member, interaction.user.id);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, `${user} was removed from this ticket.`)] });
      return;
    }

    if (subcommand === "rename") {
      const name = interaction.options.getString("name", true);
      const newName = await renameTicket(channel, ticket, name, interaction.user.id);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, `Ticket renamed to **#${newName}**.`)] });
      return;
    }

    if (subcommand === "transcript") {
      await interaction.deferReply();
      const result = await generateAndDeliverTranscript(channel, ticket, interaction.user.id);
      const parts = [
        result.deliveredToChannel ? "sent to the transcript channel" : null,
        result.deliveredToDm ? "DMed to the ticket owner" : null,
      ].filter(Boolean);

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            interaction.client,
            parts.length > 0 ? `Transcript generated and ${parts.join(" and ")}.` : "Transcript generated (attached below).",
          ),
        ],
        files: parts.length > 0 ? [] : [result.attachment],
      });
    }
  },
};
