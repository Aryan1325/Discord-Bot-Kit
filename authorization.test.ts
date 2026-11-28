import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canPerformTicketAction, type TicketAction } from "./authorization.js";

const ALL: TicketAction[] = ["close", "reopen", "delete", "transcript", "add_user", "remove_user", "rename"];
const base = { ownerId: "owner" };

describe("canPerformTicketAction", () => {
  it("lets staff do everything", () => {
    for (const a of ALL) assert.equal(canPerformTicketAction(a, { ...base, userId: "staff", isStaff: true }).allowed, true, a);
  });
  it("lets the owner close their ticket, and nothing else", () => {
    assert.equal(canPerformTicketAction("close", { ...base, userId: "owner", isStaff: false }).allowed, true);
    for (const a of ALL.filter((x) => x !== "close")) assert.equal(canPerformTicketAction(a, { ...base, userId: "owner", isStaff: false }).allowed, false, a);
  });
  it("denies everyone else (e.g. a user the owner added), for every action", () => {
    for (const a of ALL) {
      const r = canPerformTicketAction(a, { ...base, userId: "random", isStaff: false });
      assert.equal(r.allowed, false, a);
      if (!r.allowed) assert.ok(r.reason.length > 0);
    }
  });
});
