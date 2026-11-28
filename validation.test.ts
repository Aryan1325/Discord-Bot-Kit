import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import { validateAssignableRole, validateSendableChannel } from "./validation.js";

// Minimal fakes — these tests exercise OUR decision logic, not discord.js itself.
const P = PermissionFlagsBits;
const NAMES = Object.entries(P) as [string, bigint][];

function perms(granted: bigint) {
  return {
    has: (p: bigint) => (granted & p) === p,
    any: (req: bigint[]) => req.some((r) => (granted & r) === r),
    missing: (req: bigint[]) => req.filter((r) => (granted & r) !== r).map((r) => NAMES.find(([, v]) => v === r)![0]),
  };
}

function makeGuild(opts: { me?: { granted: bigint; highest: number } | null; ownerId?: string } = {}) {
  const me = opts.me === null ? null : { permissions: perms((opts.me ?? { granted: 0n }).granted), roles: { highest: { position: opts.me?.highest ?? 5 } }, id: "bot" };
  return { id: "g1", ownerId: opts.ownerId ?? "owner", members: { me } } as any;
}

function makeChannel(over: { guildId?: string; type?: ChannelType; granted: bigint }) {
  return { id: "c1", guildId: over.guildId ?? "g1", type: over.type ?? ChannelType.GuildText, permissionsFor: () => perms(over.granted) } as any;
}

const BASIC = P.ViewChannel | P.SendMessages;

describe("validateSendableChannel", () => {
  it("accepts a text channel where the bot has access (e.g. a private #rules channel)", () => {
    const r = validateSendableChannel(makeGuild({ me: { granted: 0n, highest: 5 } }), makeChannel({ granted: BASIC | P.EmbedLinks }), { embeds: true });
    assert.equal(r.ok, true);
  });
  it("rejects a channel from another server", () => {
    const r = validateSendableChannel(makeGuild({ me: { granted: 0n, highest: 5 } }), makeChannel({ guildId: "other", granted: BASIC }));
    assert.equal(r.ok, false);
  });
  it("rejects missing / voice channels", () => {
    const g = makeGuild({ me: { granted: 0n, highest: 5 } });
    assert.equal(validateSendableChannel(g, null).ok, false);
    assert.equal(validateSendableChannel(g, makeChannel({ type: ChannelType.GuildVoice, granted: BASIC })).ok, false);
  });
  it("reports exactly which permissions are missing", () => {
    const r = validateSendableChannel(makeGuild({ me: { granted: 0n, highest: 5 } }), makeChannel({ granted: P.ViewChannel }), { embeds: true, attachments: true });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.reason, /Send Messages/);
      assert.match(r.reason, /Embed Links/);
      assert.match(r.reason, /Attach Files/);
      assert.doesNotMatch(r.reason, /View Channel/);
    }
  });
  it("does not require embed/attach permissions unless asked", () => {
    assert.equal(validateSendableChannel(makeGuild({ me: { granted: 0n, highest: 5 } }), makeChannel({ granted: BASIC })).ok, true);
  });
  it("accepts threads only when allowed, and checks thread send permission", () => {
    const g = makeGuild({ me: { granted: 0n, highest: 5 } });
    const thread = makeChannel({ type: ChannelType.PublicThread, granted: P.ViewChannel | P.SendMessagesInThreads });
    assert.equal(validateSendableChannel(g, thread).ok, false);
    assert.equal(validateSendableChannel(g, thread, { allowThreads: true }).ok, true);
  });
  it("fails safely when the bot member is unavailable", () => {
    assert.equal(validateSendableChannel(makeGuild({ me: null }), makeChannel({ granted: BASIC })).ok, false);
  });
});

describe("validateAssignableRole", () => {
  const role = (over: Partial<{ id: string; position: number; managed: boolean; guildId: string; granted: bigint }> = {}) =>
    ({ id: over.id ?? "r1", name: "Member", position: over.position ?? 2, managed: over.managed ?? false, guild: { id: over.guildId ?? "g1" }, permissions: perms(over.granted ?? 0n) }) as any;
  const botOk = { granted: P.ManageRoles, highest: 5 };

  it("accepts a normal role below the bot", () => assert.equal(validateAssignableRole(makeGuild({ me: botOk }), role()).ok, true));
  it("rejects missing, @everyone, managed and foreign-guild roles", () => {
    const g = makeGuild({ me: botOk });
    assert.equal(validateAssignableRole(g, null).ok, false);
    assert.equal(validateAssignableRole(g, role({ id: "g1" })).ok, false);
    assert.equal(validateAssignableRole(g, role({ managed: true })).ok, false);
    assert.equal(validateAssignableRole(g, role({ guildId: "other" })).ok, false);
  });
  it("rejects when the bot lacks Manage Roles", () => assert.equal(validateAssignableRole(makeGuild({ me: { granted: 0n, highest: 5 } }), role()).ok, false));
  it("rejects roles at or above the bot's highest role", () => {
    const g = makeGuild({ me: botOk });
    assert.equal(validateAssignableRole(g, role({ position: 5 })).ok, false);
    assert.equal(validateAssignableRole(g, role({ position: 9 })).ok, false);
  });
  it("blocks privilege escalation by a non-owner executor, but not for the owner", () => {
    const g = makeGuild({ me: botOk });
    const exec = { id: "u1", roles: { highest: { position: 3 } } } as any;
    assert.equal(validateAssignableRole(g, role({ position: 4 }), { executor: exec }).ok, false);
    assert.equal(validateAssignableRole(g, role({ position: 2 }), { executor: exec }).ok, true);
    assert.equal(validateAssignableRole(g, role({ position: 4 }), { executor: { ...exec, id: "owner" } }).ok, true);
  });
  it("rejects moderator/admin roles only when rejectPrivileged is set", () => {
    const g = makeGuild({ me: botOk });
    const admin = role({ granted: P.Administrator });
    const mod = role({ granted: P.BanMembers });
    assert.equal(validateAssignableRole(g, admin).ok, true);
    assert.equal(validateAssignableRole(g, admin, { rejectPrivileged: true }).ok, false);
    assert.equal(validateAssignableRole(g, mod, { rejectPrivileged: true }).ok, false);
    assert.equal(validateAssignableRole(g, role({ granted: P.ViewChannel }), { rejectPrivileged: true }).ok, true);
  });
});
