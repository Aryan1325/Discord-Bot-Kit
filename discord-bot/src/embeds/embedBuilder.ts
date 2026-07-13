import { EmbedBuilder, type Client } from "discord.js";
import { botConfig } from "../config/botConfig.js";

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface CreateEmbedOptions {
  /** The logged-in client — used to source the bot avatar for author/thumbnail/footer. */
  client: Client;
  title?: string;
  /** Adds a clickable link to the title. */
  url?: string;
  description?: string;
  fields?: EmbedField[];
  color?: number;
  image?: string;
  /** Override the default bot-avatar thumbnail. Pass `null` to omit the thumbnail entirely. */
  thumbnail?: string | null;
  author?: { name: string; iconURL?: string; url?: string };
  footer?: { text: string; iconURL?: string };
  /** Defaults to `true`. */
  timestamp?: boolean;
}

/**
 * The single source of truth for AK ESPORTS embed branding. Every embed
 * built with this helper automatically gets the bot's avatar as its author
 * icon, thumbnail, and footer icon, the brand color, the standard footer
 * text, and a timestamp — so individual commands only need to supply
 * content.
 */
export function createEmbed(options: CreateEmbedOptions): EmbedBuilder {
  const botAvatar = options.client.user?.displayAvatarURL({ size: 256 });

  const embed = new EmbedBuilder().setColor(options.color ?? botConfig.colors.primary);

  if (options.title) {
    embed.setTitle(options.title);
  }
  if (options.url) {
    embed.setURL(options.url);
  }
  if (options.description) {
    embed.setDescription(options.description);
  }
  if (options.fields?.length) {
    embed.addFields(options.fields);
  }
  if (options.image) {
    embed.setImage(options.image);
  }

  if (options.thumbnail !== null) {
    const thumbnail = options.thumbnail ?? botAvatar;
    if (thumbnail) {
      embed.setThumbnail(thumbnail);
    }
  }

  embed.setAuthor({
    name: options.author?.name ?? botConfig.name,
    iconURL: options.author?.iconURL ?? botAvatar,
    url: options.author?.url,
  });

  embed.setFooter({
    text: options.footer?.text ?? botConfig.footer.text,
    iconURL: options.footer?.iconURL ?? botAvatar,
  });

  if (options.timestamp !== false) {
    embed.setTimestamp();
  }

  return embed;
}

/** Standardized red error embed used by the global interaction error handler. */
export function createErrorEmbed(client: Client, message: string): EmbedBuilder {
  return createEmbed({
    client,
    title: "Something went wrong",
    description: message,
    color: botConfig.colors.error,
  });
}

/** Standardized green success embed for confirmations. */
export function createSuccessEmbed(client: Client, message: string): EmbedBuilder {
  return createEmbed({
    client,
    title: "Success",
    description: message,
    color: botConfig.colors.success,
  });
}
