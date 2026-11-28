import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeGuildConfig, type GuildLookup } from "./importValidation.js";

const CH = "111111111111111111"; // text channel in THIS server
const CAT = "222222222222222222";
const ROLE = "333333333333333333";
const FOREIGN = "999999999999999999";

const lookup: GuildLookup = {
  isTextChannel: (id) => id === CH,
  isCategory: (id) => id === CAT,
  isAssignableRoleId: (id) => id === ROLE,
};

describe("sanitizeGuildConfig", () => {
  it("rejects non-objects", () => {
    for (const bad of [null, "x", 5, [], undefined]) {
      const r = sanitizeGuildConfig(bad, lookup);
      assert.deepEqual(r.config, {});
      assert.ok(r.notes.length > 0);
    }
  });
  it("keeps references that exist in this server", () => {
    const r = sanitizeGuildConfig({ welcome: { enabled: true, channelId: CH, autoRoleId: ROLE }, tickets: { enabled: true, categoryId: CAT, supportRoleId: ROLE } }, lookup);
    assert.equal((r.config.welcome as any).channelId, CH);
    assert.equal((r.config.welcome as any).autoRoleId, ROLE);
    assert.equal((r.config.tickets as any).enabled, true);
    assert.deepEqual(r.notes, []);
  });
  it("clears IDs from another server and disables features that lost required references", () => {
    const r = sanitizeGuildConfig(
      { welcome: { enabled: true, channelId: FOREIGN }, verification: { enabled: true, channelId: CH, roleId: FOREIGN }, tickets: { enabled: true, categoryId: FOREIGN, supportRoleId: ROLE }, logging: { channelId: FOREIGN } },
      lookup,
    );
    assert.equal((r.config.welcome as any).channelId, null);
    assert.equal((r.config.welcome as any).enabled, false);
    assert.equal((r.config.verification as any).enabled, false);
    assert.equal((r.config.tickets as any).enabled, false);
    assert.equal((r.config.logging as any).channelId, null);
    assert.ok(r.notes.length >= 4);
  });
  it("rejects non-snowflake / injected values", () => {
    const r = sanitizeGuildConfig({ welcome: { enabled: true, channelId: "1; DROP TABLE x" } }, lookup);
    assert.equal((r.config.welcome as any).channelId, null);
  });
  it("caps text lengths and clamps numbers", () => {
    const r = sanitizeGuildConfig({ welcome: { title: "t".repeat(1000), message: "m".repeat(5000) }, tickets: { maxOpenTickets: 9999, ticketNameFormat: "x".repeat(500) } }, lookup);
    assert.equal((r.config.welcome as any).title.length, 256);
    assert.equal((r.config.welcome as any).message.length, 2000);
    assert.equal((r.config.tickets as any).maxOpenTickets, 50);
    assert.equal((r.config.tickets as any).ticketNameFormat.length, 100);
  });
  it("keeps only known log events and drops unknown fields", () => {
    const r = sanitizeGuildConfig({ logging: { channelId: CH, enabledEvents: ["member_join", "member_join", "bogus", 7] }, evil: { x: 1 } }, lookup);
    assert.deepEqual((r.config.logging as any).enabledEvents, ["member_join"]);
    assert.equal("evil" in r.config, false);
  });
  it("reports when nothing recognizable is present", () => {
    const r = sanitizeGuildConfig({ foo: 1 }, lookup);
    assert.deepEqual(r.config, {});
    assert.match(r.notes.join(" "), /recognizable/);
  });
});
