import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditReason, fieldText, REASON_MAX_LENGTH } from "./reason.js";

describe("reason helpers", () => {
  it("allows long reasons in the command", () => assert.ok(REASON_MAX_LENGTH >= 3000));
  it("leaves short reasons untouched", () => {
    assert.equal(auditReason("spam"), "spam");
    assert.equal(fieldText("spam"), "spam");
  });
  it("shortens to Discord's limits and marks the cut", () => {
    const long = "x".repeat(REASON_MAX_LENGTH);
    assert.equal(auditReason(long).length, 512);
    assert.equal(fieldText(long).length, 1024);
    assert.ok(auditReason(long).endsWith("…"));
  });
  it("never exceeds the limit at the boundary", () => {
    assert.equal(auditReason("y".repeat(512)).length, 512);
    assert.equal(auditReason("y".repeat(513)).length, 512);
  });
});
