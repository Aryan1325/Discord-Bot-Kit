import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type GuildMember, type GuildTextBasedChannel } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureMemberPermission } from "../utils/permissions.js";
import { fetchGuildChannel, validateAssignableRole, validateSendableChannel } from "../utils/validation.js";
import { addReactionRole, getReactionRole, listReactionRoles, removeReactionRole } from "../database/repositories.js";
import { parseEmojiInput } from "../reactionRoles/emoji.js";

const MESSAGE_ID = /^\d{15,25}$/;

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Give members a role when they react to a message.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Link an emoji on a message to a role.")
        .addStringOption((o) => o.setName("message_id").setDescription("ID of the message members will react to.").setRequired(true))
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji to react with (standard or from this server).").setRequired(true))
        .addRoleOption((o) => o.setName("role").setDescription("Role to give.").setRequired(true))
        .addChannelOption((o) => o.setName("channel").setDescription("Channel the message is in. Defaults to this channel.").setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove an emoji → role link.")
        .addStringOption((o) => o.setName("message_id").setDescription("Message ID.").setRequired(true))
        .addStringOption((o) => o.setName("emoji").setDescription("The emoji to unlink.").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List this server's reaction roles."))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageRoles, "Manage Roles"))) return;

    const guild = interaction.guild;
    const fail = (message: string) => interaction.reply({ embeds: [createErrorEmbed(interaction.client, message)], flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand(true);

    if (sub === "list") {
      const rows = listReactionRoles(guild.id);
      const description = rows.length
        ? rows.slice(0, 25).map((r) => `${/^\d+$/.test(r.emoji) ? `<:e:${r.emoji}>` : r.emoji} → <@&${r.roleId}> — [message](https://discord.com/channels/${guild.id}/${r.channelId}/${r.messageId})`).join("\n")
        : "No reaction roles are set up yet.";
      await interaction.reply({ embeds: [createEmbed({ client: interaction.client, title: "Reaction Roles", description })], flags: MessageFlags.Ephemeral });
      return;
    }

    const messageId = interaction.options.getString("message_id", true).trim();
    const emoji = parseEmojiInput(interaction.options.getString("emoji", true));
    if (!MESSAGE_ID.test(messageId)) { await fail("That doesn't look like a valid message ID."); return; }
    if (!emoji) { await fail("I couldn't read that emoji. Use a standard emoji or one from this server."); return; }

    if (sub === "remove") {
      if (!getReactionRole(messageId, emoji.key)) { await fail("No reaction role is linked to that message and emoji."); return; }
      // Only entries that belong to this server can be removed from this server.
      if (getReactionRole(messageId, emoji.key)!.guildId !== guild.id) { await fail("No reaction role is linked to that message and emoji."); return; }
      removeReactionRole(messageId, emoji.key);
      await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "Reaction role removed.")], flags: MessageFlags.Ephemeral });
      return;
    }

    // add
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const failDeferred = (message: string) => interaction.editReply({ embeds: [createErrorEmbed(interaction.client, message)] });

    const roleOption = interaction.options.getRole("role", true);
    const roleCheck = validateAssignableRole(guild, guild.roles.cache.get(roleOption.id), { executor: interaction.member as GuildMember, rejectPrivileged: true });
    if (!roleCheck.ok) { await failDeferred(roleCheck.reason); return; }

    const channelOption = interaction.options.getChannel("channel", false);
    const channel = await fetchGuildChannel(guild, channelOption?.id ?? interaction.channelId);
    const channelCheck = validateSendableChannel(guild, channel, { allowThreads: true });
    if (!channelCheck.ok || !channelCheck.value.isTextBased()) { await failDeferred(channelCheck.ok ? "That isn't a text channel." : channelCheck.reason); return; }

    const textChannel = channelCheck.value as GuildTextBasedChannel;
    const me = guild.members.me;
    const missing = me ? textChannel.permissionsFor(me)?.missing([PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory]) ?? [] : [];
    if (missing.length) { await failDeferred(`I'm missing these permissions in <#${textChannel.id}>: ${missing.join(", ")}.`); return; }

    const message = await textChannel.messages.fetch(messageId).catch(() => null);
    if (!message) { await failDeferred("I couldn't find that message in that channel."); return; }
    if (getReactionRole(messageId, emoji.key)) { await failDeferred("That emoji is already linked on this message. Remove it first."); return; }

    try {
      await message.react(emoji.reactable);
    } catch {
      await failDeferred("I couldn't react with that emoji — is it from a server I'm not in?");
      return;
    }

    addReactionRole({ guildId: guild.id, messageId, channelId: textChannel.id, emoji: emoji.key, roleId: roleCheck.value.id });
    await interaction.editReply({ embeds: [createSuccessEmbed(interaction.client, `Reacting with ${emoji.reactable} on that message now gives **${roleCheck.value.name}**.`)] });
  },
};
