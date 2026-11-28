/**
 * Server-side ticket authorization. Every ticket button, modal and slash
 * subcommand must pass through `canPerformTicketAction` — custom IDs and
 * client-side button visibility are never trusted, because anyone who can
 * see the ticket channel (e.g. a user the owner added) can click the buttons.
 *
 * Policy:
 *  - Staff (configured support role, Manage Server, or Administrator) may do everything.
 *  - The ticket owner may only close their own, still-open ticket.
 *  - Everyone else (e.g. users added to the ticket) may do nothing.
 */
export type TicketAction = "close" | "reopen" | "delete" | "transcript" | "add_user" | "remove_user" | "rename";

export interface TicketAuthContext {
  userId: string;
  ownerId: string;
  /** Has the configured support role, Manage Server, or Administrator. */
  isStaff: boolean;
}

export type TicketAuthResult = { allowed: true } | { allowed: false; reason: string };

const OWNER_ACTIONS: ReadonlySet<TicketAction> = new Set(["close"]);

export function canPerformTicketAction(action: TicketAction, ctx: TicketAuthContext): TicketAuthResult {
  if (ctx.isStaff) return { allowed: true };
  if (ctx.userId === ctx.ownerId && OWNER_ACTIONS.has(action)) return { allowed: true };
  if (ctx.userId === ctx.ownerId) {
    return { allowed: false, reason: "Only support staff can do that. You can close your own ticket and staff will take it from there." };
  }
  return { allowed: false, reason: "Only support staff or the ticket owner can use ticket controls." };
}
