import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type GuildMember } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureMemberPermission } from "../utils/permissions.js";
import { getWelcomeSettings, upsertWelcomeSettings } from "../database/repositories.js";
import { invalidateGuildCache } from "../cache/settingsCache.js";
import { buildCardAttachment, buildMemberEmbed, getWelcomeDefaults } from "../welcome/embeds.js";
import { generateMemberCard } from "../welcome/card.js";
import { applyPlaceholders } from "../welcome/placeholders.js";
import { fetchGuildChannel, validateAssignableRole, validateSendableChannel } from "../utils/validation.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the welcome message shown when a member joins.")
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Configure and enable the welcome system.")
        .addChannelOption((opt) => opt.setName("channel").setDescription("Channel welcome messages are posted to.").setRequired(true))
        .addRoleOption((opt) => opt.setName("auto_role").setDescription("Role automatically given to new members.").setRequired(false))
        .addBooleanOption((opt) => opt.setName("dm_enable").setDescription("Also DM the welcome message to the new member.").setRequired(false))
        .addBooleanOption((opt) => opt.setName("image_enable").setDescription("Generate a welcome image card.").setRequired(false))
        .addBooleanOption((opt) => opt.setName("embed_enable").setDescription("Send as an embed (disable for plain text). Default: on.").setRequired(false))
        .addStringOption((opt) => opt.setName("title").setDescription("Custom embed title. See /help for placeholders.").setRequired(false))
        .addStringOption((opt) => opt.setName("description").setDescription("Custom embed/message text. See /help for placeholders.").setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("disable").setDescription("Disable the welcome system."))
    .addSubcommand((sub) => sub.setName("test").setDescription("Send a test welcome message to the configured channel using your account."))
    .addSubcommand((sub) => sub.setName("preview").setDescription("Preview the welcome message here, without saving or posting anywhere."))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);
    const guildId = interaction.guild.id;

    if (subcommand === "setup") {
      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

      const channel = interaction.options.getChannel("channel", true);
      const autoRole = interaction.options.getRole("auto_role", false);
      const dmEnable = interaction.options.getBoolean("dm_enable", false);
      const imageEnable = interaction.options.getBoolean("image_enable", false);
      const embedEnable = interaction.options.getBoolean("embed_enable", false);
      const title = interaction.options.getString("title", false);
      const description = interaction.options.getString("description", false);

      // Validate everything BEFORE saving so a bad config is never persisted.
      const channelCheck = validateSendableChannel(interaction.guild, await fetchGuildChannel(interaction.guild, channel.id), {
        embeds: embedEnable ?? true,
        attachments: imageEnable ?? false,
      });
      if (!channelCheck.ok) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, channelCheck.reason)], flags: MessageFlags.Ephemeral });
        return;
      }
      if (autoRole) {
        const roleCheck = validateAssignableRole(interaction.guild, interaction.guild.roles.cache.get(autoRole.id), {
          executor: interaction.member as GuildMember,
          rejectPrivileged: true,
        });
        if (!roleCheck.ok) {
          await interaction.reply({ embeds: [createErrorEmbed(interaction.client, roleCheck.reason)], flags: MessageFlags.Ephemeral });
          return;
        }
      }

      const settings = upsertWelcomeSettings(guildId, {
        enabled: true,
        channelId: channel.id,
        ...(autoRole ? { autoRoleId: autoRole.id } : {}),
        ...(dmEnable !== null ? { dmEnabled: dmEnable } : {}),
        ...(imageEnable !== null ? { imageEnabled: imageEnable } : {}),
        ...(embedEnable !== null ? { embedEnabled: embedEnable } : {}),
        ...(title !== null ? { title } : {}),
        ...(description !== null ? { description } : {}),
      });
      invalidateGuildCache(guildId);

      const embed = createSuccessEmbed(interaction.client, "Welcome system configured successfully.");
      embed.addFields(
        { name: "Channel", value: `<#${settings.channelId}>`, inline: true },
        { name: "Auto Role", value: settings.autoRoleId ? `<@&${settings.autoRoleId}>` : "Not set", inline: true },
        { name: "DM Welcome", value: settings.dmEnabled ? "Enabled" : "Disabled", inline: true },
        { name: "Image Card", value: settings.imageEnabled ? "Enabled" : "Disabled", inline: true },
        { name: "Embed", value: settings.embedEnabled ? "Enabled" : "Disabled (plain text)", inline: true },
      );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "disable") {
      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

      upsertWelcomeSettings(guildId, { enabled: false });
      invalidateGuildCache(guildId);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "The welcome system has been disabled.")], flags: MessageFlags.Ephemeral });
      return;
    }

    const settings = getWelcomeSettings(guildId);
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (subcommand === "test") {
      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

      if (!settings?.channelId) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, "No welcome channel is configured yet. Run `/welcome setup` first.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channelCheck = validateSendableChannel(interaction.guild, await fetchGuildChannel(interaction.guild, settings.channelId), {
        embeds: settings.embedEnabled,
        attachments: settings.imageEnabled,
      });
      if (!channelCheck.ok || !channelCheck.value.isTextBased()) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, channelCheck.ok ? "The configured welcome channel isn't a text channel." : channelCheck.reason)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const channel = channelCheck.value;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const files = [];
      let imageAttachmentName: string | undefined;
      if (settings.imageEnabled) {
        const buffer = await generateMemberCard(member, interaction.guild, "join");
        const attachment = buildCardAttachment(buffer, "welcome");
        files.push(attachment);
        imageAttachmentName = attachment.name ?? undefined;
      }

      if (settings.embedEnabled) {
        const embed = buildMemberEmbed({
          client: interaction.client,
          member,
          guild: interaction.guild,
          kind: "welcome",
          settings: { title: settings.title, description: settings.description },
          imageAttachmentName,
        });
        await channel.send({ content: "**(Test)**", embeds: [embed], files, allowedMentions: { parse: [], users: [member.id] } });
      } else {
        await channel.send({ content: `**(Test)** ${applyPlaceholders(settings.message ?? getWelcomeDefaults().description, member, interaction.guild)}`, files, allowedMentions: { parse: [], users: [member.id] } });
      }

      await interaction.editReply({ embeds: [createSuccessEmbed(interaction.client, `Test welcome message sent to ${channel}.`)] });
      return;
    }

    if (subcommand === "preview") {
      const embedEnabled = settings?.embedEnabled ?? true;
      const files = [];
      let imageAttachmentName: string | undefined;

      if (settings?.imageEnabled) {
        const buffer = await generateMemberCard(member, interaction.guild, "join");
        const attachment = buildCardAttachment(buffer, "welcome");
        files.push(attachment);
        imageAttachmentName = attachment.name ?? undefined;
      }

      if (embedEnabled) {
        const embed = buildMemberEmbed({
          client: interaction.client,
          member,
          guild: interaction.guild,
          kind: "welcome",
          settings: { title: settings?.title ?? null, description: settings?.description ?? null },
          imageAttachmentName,
        });
        await interaction.reply({ embeds: [embed], files, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: applyPlaceholders(settings?.message ?? getWelcomeDefaults().description, member, interaction.guild), files, flags: MessageFlags.Ephemeral });
      }
    }
  },
};
