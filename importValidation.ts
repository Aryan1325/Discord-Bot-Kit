import { LogEventType } from "../logging/types.js";

/**
 * Sanitizes an imported `/config export` JSON before it touches the database.
 * Nothing in an uploaded file is trusted: IDs must exist in THIS server (so a
 * config exported from another server can never point at foreign channels or
 * roles), text fields are length-capped, and unknown fields are dropped.
 * Invalid references are nulled out and reported, rather than saved.
 */
export interface GuildLookup {
  isTextChannel(id: string): boolean;
  isCategory(id: string): boolean;
  isAssignableRoleId(id: string): boolean;
}

export interface SanitizeResult {
  config: Record<string, unknown>;
  notes: string[];
}

const SNOWFLAKE = /^\d{15,25}$/;
const VALID_EVENTS = new Set<string>(Object.values(LogEventType));

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.slice(0, max) : null;
}

export function sanitizeGuildConfig(input: unknown, lookup: GuildLookup): SanitizeResult {
  const notes: string[] = [];
  const config: Record<string, unknown> = {};
  if (!isObject(input)) return { config, notes: ["The file isn't a configuration object."] };

  const ref = (section: string, field: string, value: unknown, check: (id: string) => boolean, kind: string): string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string" || !SNOWFLAKE.test(value) || !check(value)) {
      notes.push(`${section}.${field}: ${kind} wasn't found in this server — cleared.`);
      return null;
    }
    return value;
  };
  const channel = (s: string, f: string, v: unknown) => ref(s, f, v, lookup.isTextChannel, "channel");
  const category = (s: string, f: string, v: unknown) => ref(s, f, v, lookup.isCategory, "category");
  const role = (s: string, f: string, v: unknown) => ref(s, f, v, lookup.isAssignableRoleId, "role");

  const common = (section: string, src: Record<string, unknown>) => ({
    enabled: src.enabled === true,
    channelId: channel(section, "channelId", src.channelId),
    message: text(src.message, 2000),
    embedEnabled: src.embedEnabled !== false,
    imageEnabled: src.imageEnabled === true,
    title: text(src.title, 256),
    description: text(src.description, 4000),
    dmEnabled: src.dmEnabled === true,
  });

  if (isObject(input.welcome)) config.welcome = { ...common("welcome", input.welcome), autoRoleId: role("welcome", "autoRoleId", input.welcome.autoRoleId) };
  if (isObject(input.goodbye)) config.goodbye = common("goodbye", input.goodbye);

  if (isObject(input.verification)) {
    const v = input.verification;
    config.verification = {
      enabled: v.enabled === true,
      channelId: channel("verification", "channelId", v.channelId),
      roleId: role("verification", "roleId", v.roleId),
      message: text(v.message, 2000),
    };
  }

  if (isObject(input.tickets)) {
    const t = input.tickets;
    const max = typeof t.maxOpenTickets === "number" && Number.isInteger(t.maxOpenTickets) ? Math.min(50, Math.max(0, t.maxOpenTickets)) : 0;
    config.tickets = {
      enabled: t.enabled === true,
      categoryId: category("tickets", "categoryId", t.categoryId),
      supportRoleId: role("tickets", "supportRoleId", t.supportRoleId),
      logChannelId: channel("tickets", "logChannelId", t.logChannelId),
      transcriptChannelId: channel("tickets", "transcriptChannelId", t.transcriptChannelId),
      maxOpenTickets: max,
      ticketNameFormat: text(t.ticketNameFormat, 100) ?? "ticket-{username}",
    };
  }

  if (isObject(input.logging)) {
    const l = input.logging;
    const events = Array.isArray(l.enabledEvents) ? l.enabledEvents.filter((e): e is string => typeof e === "string" && VALID_EVENTS.has(e)) : [];
    config.logging = { channelId: channel("logging", "channelId", l.channelId), enabledEvents: [...new Set(events)] };
  }

  // A feature that is "enabled" but lost its required references is switched off, not left half-configured.
  const w = config.welcome as { enabled: boolean; channelId: string | null } | undefined;
  if (w?.enabled && !w.channelId) { w.enabled = false; notes.push("welcome: disabled because its channel is missing."); }
  const g = config.goodbye as { enabled: boolean; channelId: string | null } | undefined;
  if (g?.enabled && !g.channelId) { g.enabled = false; notes.push("goodbye: disabled because its channel is missing."); }
  const vv = config.verification as { enabled: boolean; channelId: string | null; roleId: string | null } | undefined;
  if (vv?.enabled && (!vv.channelId || !vv.roleId)) { vv.enabled = false; notes.push("verification: disabled because its channel or role is missing."); }
  const tt = config.tickets as { enabled: boolean; categoryId: string | null; supportRoleId: string | null } | undefined;
  if (tt?.enabled && (!tt.categoryId || !tt.supportRoleId)) { tt.enabled = false; notes.push("tickets: disabled because its category or support role is missing."); }

  if (Object.keys(config).length === 0) notes.push("No recognizable sections (welcome, goodbye, verification, tickets, logging) were found.");
  return { config, notes };
}
