import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Add or remove a role from a member.")
    .addUserOption((option) => option.setName("user").setDescription("The member to update.").setRequired(true))
    .addRoleOption((option) => option.setName("role").setDescription("The role to add or remove.").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Whether to add or remove the role.")
        .addChoices({ name: "Add", value: "add" }, { name: "Remove", value: "remove" })
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageRoles, "Manage Roles"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.ManageRoles, "Manage Roles"))) return;

    const targetUser = interaction.options.getUser("user", true);
    const roleOption = interaction.options.getRole("role", true);
    const action = interaction.options.getString("action", true) as "add" | "remove";
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const role = await interaction.guild.roles.fetch(roleOption.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "That user isn't a member of this server.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!role) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "I couldn't find that role.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const me = interaction.guild.members.me;
    if (role.managed || (me && role.position >= me.roles.highest.position)) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(interaction.client, "I can't manage that role — it's either managed by an integration or higher than my highest role."),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const executor = interaction.member;
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    if (executor && "roles" in executor && !isOwner) {
      const executorTopPosition = Array.isArray(executor.roles)
        ? 0
        : executor.roles.highest.position;
      if (role.position >= executorTopPosition) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, "You can't manage a role equal to or higher than your own highest role.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    const alreadyHasRole = targetMember.roles.cache.has(role.id);

    if (action === "add" && alreadyHasRole) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, `**${targetUser.tag}** already has the **${role.name}** role.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === "remove" && !alreadyHasRole) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, `**${targetUser.tag}** doesn't have the **${role.name}** role.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === "add") {
      await targetMember.roles.add(role);
    } else {
      await targetMember.roles.remove(role);
    }

    const embed = createSuccessEmbed(
      interaction.client,
      action === "add"
        ? `Added **${role.name}** to **${targetUser.tag}**.`
        : `Removed **${role.name}** from **${targetUser.tag}**.`,
    );
    await interaction.reply({ embeds: [embed] });
  },
};
