import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed } from "../embeds/embedBuilder.js";
import { ensureBotPermission, ensureMemberPermission } from "../utils/permissions.js";

/** Accepts `#00e5ff`, `00e5ff`, or a bare `0x00e5ff` and returns a numeric color, or null if invalid. */
function parseColor(input: string | null): number | null {
  if (!input) return null;
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return parseInt(hex, 16);
}

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
    .setName("embed")
    .setDescription("Post a fully customizable branded embed.")
    .addStringOption((option) => option.setName("title").setDescription("Embed title.").setRequired(false))
    .addStringOption((option) =>
      option.setName("description").setDescription("Embed description (supports mentions).").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("color").setDescription("Hex color, e.g. #00E5FF.").setRequired(false),
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
    .addStringOption((option) => option.setName("footer").setDescription("Footer text.").setRequired(false))
    .addStringOption((option) =>
      option.setName("footer_icon_url").setDescription("Small icon shown next to the footer text.").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || !("send" in interaction.channel)) {
      await interaction.reply({
        content: "This command can only be used in a server text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageMessages, "Manage Messages"))) return;
    if (!(await ensureBotPermission(interaction, PermissionFlagsBits.SendMessages, "Send Messages"))) return;

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const colorInput = interaction.options.getString("color");
    const thumbnailInput = interaction.options.getString("thumbnail_url");
    const imageInput = interaction.options.getString("image_url");
    const bannerInput = interaction.options.getString("banner_url");
    const footer = interaction.options.getString("footer");
    const footerIconInput = interaction.options.getString("footer_icon_url");

    if (!title && !description && !isValidUrl(imageInput) && !isValidUrl(bannerInput)) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            interaction.client,
            "Provide at least a title, description, image, or banner — an empty embed can't be sent.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const color = parseColor(colorInput);
    if (colorInput && color === null) {
      await interaction.reply({
        embeds: [createErrorEmbed(interaction.client, "That color isn't a valid hex code — try something like `#00E5FF`.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // All synchronous validation has passed. Acknowledge the interaction
    // immediately so Discord never sees us go past the 3-second response
    // window — the actual channel.send() below is a network call and
    // must not race that deadline.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // banner_url takes priority over image_url when both are provided.
    const resolvedImage = isValidUrl(bannerInput) ? bannerInput : isValidUrl(imageInput) ? imageInput : undefined;

    const embed = createEmbed({
      client: interaction.client,
      title: title ?? undefined,
      description: description ?? undefined,
      color: color ?? undefined,
      thumbnail: isValidUrl(thumbnailInput) ? thumbnailInput : undefined,
      image: resolvedImage,
      footer: footer
        ? {
            text: footer,
            iconURL: isValidUrl(footerIconInput) ? footerIconInput : undefined,
          }
        : undefined,
    });

    try {
      await interaction.channel.send({
        embeds: [embed],
        allowedMentions: { parse: ["users", "roles"] },
      });
    } catch (error) {
      console.error("[COMMAND] /embed failed to send the channel message:", error);
      await interaction.editReply({
        embeds: [createErrorEmbed(interaction.client, "I couldn't post that embed — please check my channel permissions and try again.")],
      });
      return;
    }

    await interaction.editReply({
      content: "Embed sent.",
    });
  },
};
