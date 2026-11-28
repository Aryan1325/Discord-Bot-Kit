import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import type { Command } from "../types/index.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Bulk-delete recent messages from this channel.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100).")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Only delete messages from this user.").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!interaction.guild || !(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        content: "This command can only be used in a server text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageMessages, "Manage Messages"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.ManageMessages, "Manage Messages"))) return;

    const amount = interaction.options.getInteger("amount", true);
    const filterUser = interaction.options.getUser("user");
    const channel = interaction.channel;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const recentMessages = await channel.messages.fetch({ limit: 100 });
    const targeted = (filterUser ? recentMessages.filter((message) => message.author.id === filterUser.id) : recentMessages)
      .first(amount);

    if (targeted.length === 0) {
      await interaction.editReply({
        embeds: [createErrorEmbed(interaction.client, "No matching messages were found to delete.")],
      });
      return;
    }

    const deleted = await channel.bulkDelete(targeted, true).catch(() => null);

    if (!deleted) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            interaction.client,
            "Couldn't delete those messages — Discord only allows bulk-deleting messages younger than 14 days.",
          ),
        ],
      });
      return;
    }

    const embed = createSuccessEmbed(
      interaction.client,
      `Deleted **${deleted.size}** message(s)${filterUser ? ` from **${filterUser.tag}**` : ""}.`,
    );
    await interaction.editReply({ embeds: [embed] });
  },
};
