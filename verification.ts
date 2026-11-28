import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type GuildMember, type GuildTextBasedChannel } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureMemberPermission } from "../utils/permissions.js";
import { fetchGuildChannel, validateAssignableRole, validateSendableChannel } from "../utils/validation.js";
import { upsertVerificationSettings } from "../database/repositories.js";
import { invalidateGuildCache } from "../cache/settingsCache.js";
import { buildVerificationPanel } from "../verification/service.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("verification")
    .setDescription("Set up button verification for new members.")
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Post a verification panel and choose the role it grants.")
        .addChannelOption((o) => o.setName("channel").setDescription("Channel to post the verification panel in.").setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role members receive when they verify.").setRequired(true))
        .addStringOption((o) => o.setName("message").setDescription("Custom panel text.").setMaxLength(1000).setRequired(false)),
    )
    .addSubcommand((sub) => sub.setName("disable").setDescription("Turn verification off (existing panels stop working)."))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

    const guild = interaction.guild;
    const guildId = guild.id;
    const sub = interaction.options.getSubcommand(true);

    if (sub === "disable") {
      upsertVerificationSettings(guildId, { enabled: false });
      invalidateGuildCache(guildId);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "Verification has been disabled.")], flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const fail = (message: string) => interaction.editReply({ embeds: [createErrorEmbed(interaction.client, message)] });

    const channelOption = interaction.options.getChannel("channel", true);
    const roleOption = interaction.options.getRole("role", true);
    const message = interaction.options.getString("message", false);

    const channelCheck = validateSendableChannel(guild, await fetchGuildChannel(guild, channelOption.id), { embeds: true });
    if (!channelCheck.ok || !channelCheck.value.isTextBased()) { await fail(channelCheck.ok ? "That isn't a text channel." : channelCheck.reason); return; }

    const roleCheck = validateAssignableRole(guild, guild.roles.cache.get(roleOption.id), { executor: interaction.member as GuildMember, rejectPrivileged: true });
    if (!roleCheck.ok) { await fail(roleCheck.reason); return; }

    // Post first, save after: a panel that failed to post never leaves a half-enabled config behind.
    try {
      await (channelCheck.value as GuildTextBasedChannel).send(buildVerificationPanel(interaction.client, message));
    } catch {
      await fail("I couldn't post the panel in that channel. Check my permissions there.");
      return;
    }

    upsertVerificationSettings(guildId, { enabled: true, channelId: channelCheck.value.id, roleId: roleCheck.value.id, message: message ?? null });
    invalidateGuildCache(guildId);
    await interaction.editReply({ embeds: [createSuccessEmbed(interaction.client, `Verification panel posted in <#${channelCheck.value.id}>. Members who click it get **${roleCheck.value.name}**.`)] });
  },
};
