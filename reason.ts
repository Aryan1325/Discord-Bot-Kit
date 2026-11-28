/**
 * Moderation reasons can be long (up to 3000 characters in the command), but
 * Discord has hard limits elsewhere, so the full text is kept for the bot's
 * own records and shortened only where Discord requires it:
 *  - audit log reason: 512 characters
 *  - embed field value: 1024 characters
 */
export const REASON_MAX_LENGTH = 3000;
const AUDIT_LOG_MAX = 512;
const EMBED_FIELD_MAX = 1024;

function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Reason as sent to Discord's audit log. */
export function auditReason(reason: string): string {
  return shorten(reason, AUDIT_LOG_MAX);
}

/** Reason as shown in an embed field. */
export function fieldText(reason: string, max = EMBED_FIELD_MAX): string {
  return shorten(reason, max);
}
