import { AttachmentBuilder, type Client, type Guild, type GuildMember } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { botConfig } from "../config/botConfig.js";
import { applyPlaceholders } from "./placeholders.js";
import type { GoodbyeSettings, WelcomeSettings } from "../database/repositories.js";

const DEFAULT_WELCOME_TITLE = "Welcome to {server}!";
const DEFAULT_WELCOME_DESCRIPTION = "{mention} just joined **{server}** — you are member **#{membercount}**! 🎉";
const DEFAULT_GOODBYE_TITLE = "A member has left";
const DEFAULT_GOODBYE_DESCRIPTION = "**{username}** has left **{server}**. We now have **{membercount}** member(s).";

export function getWelcomeDefaults(): { title: string; description: string } {
  return { title: DEFAULT_WELCOME_TITLE, description: DEFAULT_WELCOME_DESCRIPTION };
}

export function getGoodbyeDefaults(): { title: string; description: string } {
  return { title: DEFAULT_GOODBYE_TITLE, description: DEFAULT_GOODBYE_DESCRIPTION };
}

interface BuildOptions {
  client: Client;
  member: GuildMember;
  guild: Guild;
  kind: "welcome" | "goodbye";
  settings: Pick<WelcomeSettings | GoodbyeSettings, "title" | "description">;
  imageAttachmentName?: string;
}

/** Builds the branded ASTRA embed for a welcome/goodbye message, with placeholders resolved. */
export function buildMemberEmbed(options: BuildOptions): EmbedBuilder {
  const { client, member, guild, kind, settings } = options;
  const defaults = kind === "welcome" ? getWelcomeDefaults() : getGoodbyeDefaults();
  const rawTitle = settings.title?.trim() || defaults.title;
  const rawDescription = settings.description?.trim() || defaults.description;

  const botAvatar = client.user?.displayAvatarURL({ size: 256 });
  const color = kind === "welcome" ? botConfig.colors.primary : botConfig.colors.error;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: botConfig.name, iconURL: botAvatar })
    .setTitle(applyPlaceholders(rawTitle, member, guild))
    .setDescription(applyPlaceholders(rawDescription, member, guild))
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: botConfig.footer.text, iconURL: botAvatar })
    .setTimestamp();

  if (options.imageAttachmentName) {
    embed.setImage(`attachment://${options.imageAttachmentName}`);
  }

  return embed;
}

/** Wraps a card PNG buffer as a Discord attachment with a stable, referenceable filename. */
export function buildCardAttachment(buffer: Buffer, kind: "welcome" | "goodbye"): AttachmentBuilder {
  return new AttachmentBuilder(buffer, { name: `${kind}-card.png` });
}
