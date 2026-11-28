/**
 * Emoji handling for reaction roles. A reaction is identified by a stable
 * key: the numeric ID for a custom emoji, or the unicode character (with the
 * variation selector stripped, so "❤️" and "❤" match) for a standard one.
 */
export interface ParsedEmoji {
  key: string;
  /** What to pass to `message.react()`. */
  reactable: string;
}

const CUSTOM = /^<a?:\w{2,32}:(\d{15,25})>$/;
const KEYCAP = /^[0-9#*]️?⃣$/u;
const FLAG = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;

export function normalizeUnicodeEmoji(value: string): string {
  return value.replaceAll("️", "");
}

export function parseEmojiInput(input: string): ParsedEmoji | null {
  const value = input.trim();
  const custom = CUSTOM.exec(value);
  if (custom) return { key: custom[1], reactable: value };
  if (!value || [...value].length > 12) return null;
  if (KEYCAP.test(value) || FLAG.test(value) || /^\p{Extended_Pictographic}/u.test(value)) {
    return { key: normalizeUnicodeEmoji(value), reactable: value };
  }
  return null;
}

/** Key for a reaction received from Discord (`emoji.id` for custom, `emoji.name` for unicode). */
export function reactionKey(emoji: { id: string | null; name: string | null }): string | null {
  if (emoji.id) return emoji.id;
  return emoji.name ? normalizeUnicodeEmoji(emoji.name) : null;
}
