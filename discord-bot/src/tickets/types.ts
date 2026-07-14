/**
 * Shared vocabulary for the ticket system: the six panel categories and
 * their labels/emojis, kept in one place so the panel embed, buttons, and
 * ticket-creation logic never drift out of sync.
 */
export type TicketType = "general" | "purchase" | "bug" | "partner" | "report" | "suggestion";

export const TICKET_TYPES: TicketType[] = ["general", "purchase", "bug", "partner", "report", "suggestion"];

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  general: "General Support",
  purchase: "Purchase Support",
  bug: "Bug Report",
  partner: "Partnership",
  report: "Staff Report",
  suggestion: "Suggestion",
};

export const TICKET_TYPE_EMOJIS: Record<TicketType, string> = {
  general: "🎮",
  purchase: "🛒",
  bug: "🐞",
  partner: "🤝",
  report: "⚠",
  suggestion: "💡",
};

export const TICKET_TYPE_BUTTON_LABELS: Record<TicketType, string> = {
  general: "General",
  purchase: "Purchase",
  bug: "Bug",
  partner: "Partner",
  report: "Report",
  suggestion: "Suggestion",
};

export function isTicketType(value: string): value is TicketType {
  return (TICKET_TYPES as string[]).includes(value);
}
