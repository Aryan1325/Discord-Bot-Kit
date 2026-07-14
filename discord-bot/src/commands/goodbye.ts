import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureMemberPermission } from "../utils/permissions.js";
import { getGoodbyeSettings, upsertGoodbyeSettings } from "../database/repositories.js";
import { invalidateGuildCache } from "../cache/settingsCache.js";
import { buildCardAttachment, buildMemberEmbed, getGoodbyeDefaults } from "../welcome/embeds.js";
import { generateMemberCard } from "../welcome/card.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("goodbye")
    .setDescription("Configure the goodbye message shown when a member leaves.")
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Configure and enable the goodbye system.")
        .addChannelOption((opt) => opt.setName("channel").setDescription("Channel goodbye messages are posted to.").setRequired(true))
        .addBooleanOption((opt) => opt.setName("dm_enable").setDescription("Also DM the goodbye message to the departing member (best-effort).").setRequired(false))
        .addBooleanOption((opt) => opt.setName("image_enable").setDescription("Generate a goodbye image card.").setRequired(false))
        .addBooleanOption((opt) => opt.setName("embed_enable").setDescription("Send as an embed (disable for plain text). Default: on.").setRequired(false))
        .addStringOption((opt) => opt.setName("title").setDescription("Custom embed title. See /help for placeholders.").setRequired(false))
        .addStringOption((opt) => opt.setName("description").setDescription("Custom embed/message text. See /help for placeholders.").setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("disable").setDescription("Disable the goodbye system."))
    .addSubcommand((sub) => sub.setName("test").setDescription("Send a test goodbye message to the configured channel using your account."))
    .addSubcommand((sub) => sub.setName("preview").setDescription("Preview the goodbye message here, without saving or posting anywhere."))
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
      const dmEnable = interaction.options.getBoolean("dm_enable", false);
      const imageEnable = interaction.options.getBoolean("image_enable", false);
      const embedEnable = interaction.options.getBoolean("embed_enable", false);
      const title = interaction.options.getString("title", false);
      const description = interaction.options.getString("description", false);

      const settings = upsertGoodbyeSettings(guildId, {
        enabled: true,
        channelId: channel.id,
        ...(dmEnable !== null ? { dmEnabled: dmEnable } : {}),
        ...(imageEnable !== null ? { imageEnabled: imageEnable } : {}),
        ...(embedEnable !== null ? { embedEnabled: embedEnable } : {}),
        ...(title !== null ? { title } : {}),
        ...(description !== null ? { description } : {}),
      });
      invalidateGuildCache(guildId);

      const embed = createSuccessEmbed(interaction.client, "Goodbye system configured successfully.");
      embed.addFields(
        { name: "Channel", value: `<#${settings.channelId}>`, inline: true },
        { name: "DM Goodbye", value: settings.dmEnabled ? "Enabled" : "Disabled", inline: true },
        { name: "Image Card", value: settings.imageEnabled ? "Enabled" : "Disabled", inline: true },
        { name: "Embed", value: settings.embedEnabled ? "Enabled" : "Disabled (plain text)", inline: true },
      );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "disable") {
      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

      upsertGoodbyeSettings(guildId, { enabled: false });
      invalidateGuildCache(guildId);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "The goodbye system has been disabled.")], flags: MessageFlags.Ephemeral });
      return;
    }

    const settings = getGoodbyeSettings(guildId);
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (subcommand === "test") {
      if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

      if (!settings?.channelId) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, "No goodbye channel is configured yet. Run `/goodbye setup` first.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channel = await interaction.client.channels.fetch(settings.channelId).catch(() => null);
      if (!channel || !("send" in channel) || typeof channel.send !== "function") {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, "The configured goodbye channel no longer exists or I can't send messages there.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const files = [];
      let imageAttachmentName: string | undefined;
      if (settings.imageEnabled) {
        const buffer = await generateMemberCard(member, interaction.guild, "leave");
        const attachment = buildCardAttachment(buffer, "goodbye");
        files.push(attachment);
        imageAttachmentName = attachment.name ?? undefined;
      }

      if (settings.embedEnabled) {
        const embed = buildMemberEmbed({
          client: interaction.client,
          member,
          guild: interaction.guild,
          kind: "goodbye",
          settings: { title: settings.title, description: settings.description },
          imageAttachmentName,
        });
        await channel.send({ content: "**(Test)**", embeds: [embed], files });
      } else {
        await channel.send({ content: `**(Test)** ${settings.message ?? getGoodbyeDefaults().description}`, files });
      }

      await interaction.editReply({ embeds: [createSuccessEmbed(interaction.client, `Test goodbye message sent to ${channel}.`)] });
      return;
    }

    if (subcommand === "preview") {
      const embedEnabled = settings?.embedEnabled ?? true;
      const files = [];
      let imageAttachmentName: string | undefined;

      if (settings?.imageEnabled) {
        const buffer = await generateMemberCard(member, interaction.guild, "leave");
        const attachment = buildCardAttachment(buffer, "goodbye");
        files.push(attachment);
        imageAttachmentName = attachment.name ?? undefined;
      }

      if (embedEnabled) {
        const embed = buildMemberEmbed({
          client: interaction.client,
          member,
          guild: interaction.guild,
          kind: "goodbye",
          settings: { title: settings?.title ?? null, description: settings?.description ?? null },
          imageAttachmentName,
        });
        await interaction.reply({ embeds: [embed], files, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: settings?.message ?? getGoodbyeDefaults().description, files, flags: MessageFlags.Ephemeral });
      }
    }
  },
};
