import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

function isValidUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Post a premium announcement embed.")
    .addStringOption((option) =>
      option.setName("message").setDescription("The announcement text.").setRequired(true),
    )
    .addBooleanOption((option) =>
      option.setName("everyone").setDescription("Ping @everyone with the announcement.").setRequired(false),
    )
    .addBooleanOption((option) =>
      option.setName("here").setDescription("Ping @here with the announcement.").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("thumbnail_url").setDescription("Small image shown in the top-right corner.").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("image_url").setDescription("Large image shown in the embed body.").setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("banner_url")
        .setDescription("Large banner image (takes priority over image_url if both are set).")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || !("send" in interaction.channel)) {
      await interaction.reply({
        content: "This command can only be used in a server text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Guild"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.SendMessages, "Send Messages"))) return;

    const message = interaction.options.getString("message", true);
    const pingEveryone = interaction.options.getBoolean("everyone") ?? false;
    const pingHere = interaction.options.getBoolean("here") ?? false;
    const thumbnailInput = interaction.options.getString("thumbnail_url");
    const imageInput = interaction.options.getString("image_url");
    const bannerInput = interaction.options.getString("banner_url");

    if ((pingEveryone || pingHere) && !(await ensureBotPermission(interaction, PermissionFlagsBits.MentionEveryone, "Mention Everyone"))) {
      return;
    }

    const resolvedImage = isValidUrl(bannerInput) ? bannerInput : isValidUrl(imageInput) ? imageInput : undefined;

    const embed = createEmbed({
      client: interaction.client,
      title: "📢 Announcement",
      description: message,
      thumbnail: isValidUrl(thumbnailInput) ? thumbnailInput : undefined,
      image: resolvedImage,
    });

    const mentionPrefix = [pingEveryone ? "@everyone" : null, pingHere ? "@here" : null].filter(Boolean).join(" ");
    const parse: ("everyone")[] = pingEveryone || pingHere ? ["everyone"] : [];

    await interaction.channel.send({
      content: mentionPrefix || undefined,
      embeds: [embed],
      allowedMentions: { parse },
    });

    await interaction.reply({
      content: "Announcement sent.",
      flags: MessageFlags.Ephemeral,
    });
  },
};
