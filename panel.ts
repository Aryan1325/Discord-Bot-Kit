import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Client } from "discord.js";
import { createEmbed } from "../embeds/embedBuilder.js";
import { botConfig } from "../config/botConfig.js";
import { TICKET_TYPES, TICKET_TYPE_BUTTON_LABELS, TICKET_TYPE_EMOJIS, type TicketType } from "./types.js";

/** customId format for panel buttons: `ticket:open:<type>`. */
export function ticketOpenCustomId(type: TicketType): string {
  return `ticket:open:${type}`;
}

/** The premium support-center embed posted by `/ticket panel`. */
export function buildTicketPanelEmbed(client: Client, bannerUrl?: string | null) {
  const categoryLines = TICKET_TYPES.map((type) => `${TICKET_TYPE_EMOJIS[type]} ${categoryLabel(type)}`).join("\n");

  const embed = createEmbed({
    client,
    title: "🎫 AK ESPORTS Support Center",
    description:
      "Need help?\n\nChoose the appropriate ticket category below.\n\n" +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      `${categoryLines}\n\n` +
      "━━━━━━━━━━━━━━━━━━\n\n" +
      "Click a button below.",
    color: botConfig.colors.primary,
  });

  if (bannerUrl) {
    embed.setImage(bannerUrl);
  }

  return embed;
}

function categoryLabel(type: TicketType): string {
  switch (type) {
    case "general":
      return "General Support";
    case "purchase":
      return "Purchase Support";
    case "bug":
      return "Bug Report";
    case "partner":
      return "Partnership";
    case "report":
      return "Staff Report";
    case "suggestion":
      return "Suggestions";
  }
}

/** The row(s) of category buttons under the panel embed. */
export function buildTicketPanelButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const buttons = TICKET_TYPES.map((type) =>
    new ButtonBuilder()
      .setCustomId(ticketOpenCustomId(type))
      .setLabel(TICKET_TYPE_BUTTON_LABELS[type])
      .setEmoji(TICKET_TYPE_EMOJIS[type])
      .setStyle(ButtonStyle.Secondary),
  );

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

/** The control-button row shown inside every ticket channel. */
export function buildTicketControlButtons(status: "open" | "closed"): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    status === "open"
      ? new ButtonBuilder().setCustomId("ticket:close").setLabel("Close").setEmoji("🔒").setStyle(ButtonStyle.Danger)
      : new ButtonBuilder().setCustomId("ticket:reopen").setLabel("Reopen").setEmoji("🔓").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("ticket:delete").setLabel("Delete").setEmoji("🗑").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("ticket:transcript").setLabel("Transcript").setEmoji("📄").setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:adduser").setLabel("Add User").setEmoji("👥").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:removeuser").setLabel("Remove User").setEmoji("➖").setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}
