import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  type StringSelectMenuOptionBuilder,
} from "discord.js";

export interface ButtonSpec {
  customId?: string;
  label: string;
  style?: ButtonStyle;
  emoji?: string;
  /** Turns this into a link button — Discord requires link buttons to omit `customId`. */
  url?: string;
  disabled?: boolean;
}

/** Builds a single row of up to 5 buttons — Discord's per-row limit. */
export function createButtonRow(buttons: ButtonSpec[]): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  for (const spec of buttons.slice(0, 5)) {
    const button = new ButtonBuilder().setLabel(spec.label).setDisabled(Boolean(spec.disabled));

    if (spec.url) {
      button.setStyle(ButtonStyle.Link).setURL(spec.url);
    } else {
      button.setStyle(spec.style ?? ButtonStyle.Secondary);
      if (spec.customId) {
        button.setCustomId(spec.customId);
      }
    }

    if (spec.emoji) {
      button.setEmoji(spec.emoji);
    }

    row.addComponents(button);
  }

  return row;
}

/** Splits a longer button list into multiple 5-per-row action rows. */
export function createButtonRows(buttons: ButtonSpec[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(createButtonRow(buttons.slice(i, i + 5)));
  }
  return rows;
}

export interface SelectMenuSpec {
  customId: string;
  placeholder?: string;
  options: StringSelectMenuOptionBuilder[] | { label: string; value: string; description?: string; emoji?: string }[];
}

/** Builds a single-row string select menu. */
export function createSelectMenu(spec: SelectMenuSpec): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder().setCustomId(spec.customId);

  if (spec.placeholder) {
    menu.setPlaceholder(spec.placeholder);
  }

  menu.addOptions(spec.options as never);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
