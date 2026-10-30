import { FOOTERS } from "@/utils/brandText";
import axios from "axios";
import { actionKind, actionLabel, describeDetails, type Fact } from "@/utils/audit/describe";
import { messageToV2 } from "@/utils/discordBot/componentsV2";
import { fillEmoji } from "@/utils/discordBot/emojiResolve";

// How an audit log event reads as a Discord embed, and Rosterr's own webhook post for new workspaces. Workspaces talk to Discord only through
// their bot (utils/discordBot); nothing here uses a workspace's credentials.

const BLURPLE = 0x5865f2;

type EmbedField = { name: string; value: string; inline?: boolean };

export interface DiscordMessage {
  color?: number;
  title?: string;
  description?: string;
  thumbnail?: { url: string };
  footer?: { text: string };
  timestamp?: string;
  fields?: EmbedField[];
}

// ---- Audit log embeds --------------------------------------------------------------------------------------------------------------

// Each audit action: the embed's title, and what the person "did" in the sentence under it.
const ACTIONS: Record<string, { title?: string; said: string }> = {
  "userbook.create": { title: "User Action Logged", said: "logged a user action" },
  "notice.approve": { title: "Notice Approved", said: "approved an inactivity notice" },
  "notice.deny": { title: "Notice Denied", said: "denied an inactivity notice" },
  "notice.cancel": { title: "Notice Cancelled", said: "cancelled an inactivity notice" },
  "document.create": { title: "Document Created", said: "created a document" },
  "document.update": { title: "Document Updated", said: "updated a document" },
  "document.delete": { title: "Document Deleted", said: "deleted a document" },
  "session.create": { title: "Session Created", said: "created a session" },
  "session.delete": { title: "Session Deleted", said: "deleted a session" },
  "wall.post.create": { title: "Wall Post Created", said: "posted on the wall" },
  "wall.post.delete": { title: "Wall Post Deleted", said: "deleted a wall post" },
  "user.staffRole.update": { title: "Role Updated", said: "had their roles updated" },
  "workspace.settings.update": { title: "Settings Updated", said: "updated workspace settings" },
  "goal.create": { said: "created a goal" },
  "goal.update": { said: "updated a goal" },
  "goal.delete": { said: "deleted a goal" },
  "discordbot.link": { title: "Discord Bot Linked", said: "linked the Discord bot" },
  "discordbot.unlink": { title: "Discord Bot Disconnected", said: "disconnected the Discord bot" },
  "discordbot.channel.set": { title: "Discord Channel Chosen", said: "chose a Discord channel for the bot to post in" },
  "discordbot.channel.toggle": { title: "Discord Channel Switched", said: "turned a Discord channel post on or off" },
  "discordbot.channel.remove": { title: "Discord Channel Stopped", said: "stopped a Discord channel post" },
  "discordbot.remove": { title: "Removed From Discord", said: "took someone out of the Discord server" },
  // Entries written before the bot took over from webhooks stay readable in the audit log.
  "webhook.stream.set": { said: "set up a Discord webhook" },
  "webhook.stream.toggle": { said: "turned a Discord webhook on or off" },
  "webhook.stream.remove": { said: "removed a Discord webhook" },
};

// The last word of an action id as a verb, for the many actions that have no sentence of their own: "session.tag.create" reads "created session tag".
const VERBS: Record<string, string> = {
  create: "created", add: "added", update: "updated", edit: "edited", delete: "deleted", remove: "removed", approve: "approved", deny: "denied", cancel: "cancelled",
  set: "set", toggle: "switched", link: "linked", unlink: "unlinked", connect: "connected", disconnect: "disconnected", register: "registered", revoke: "revoked",
  export: "exported", import: "imported", redact: "redacted", assign: "assigned", unassign: "unassigned", publish: "published", close: "closed", open: "opened",
  reset: "reset", rename: "renamed", move: "moved", start: "started", end: "ended", claim: "claimed", reject: "rejected", accept: "accepted", sign: "signed",
};

/** A title for an action with none written: the in-app name with its verb in the past tense ("Session tag created"). */
function autoTitle(action: string): string {
  const label = actionLabel(action);
  const words = label.split(" ");
  const verb = VERBS[words[words.length - 1]?.toLowerCase() ?? ""];
  if (verb && words.length > 1) return `${words.slice(0, -1).join(" ")} ${verb}`;
  const kind = actionKind(action);
  return kind === "create" ? `${label} created` : kind === "update" ? `${label} updated` : kind === "delete" ? `${label} removed` : label;
}

/** "created session tag" reads as "created a session tag". Plurals ("settings") and phrases that already have one are left alone. */
function withArticle(noun: string): string {
  if (/^(a|an|the|some|their|your)\s/i.test(noun) || /s$/i.test(noun) || /:/.test(noun)) return noun;
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

/** What the person did, in a sentence: the written one when there is one, otherwise built from the action id. */
export function getActionDescription(action: string): string {
  const known = ACTIONS[action]?.said;
  if (known) return known;
  const label = actionLabel(action).toLowerCase();
  const words = label.split(" ");
  const verb = VERBS[words[words.length - 1] ?? ""];
  if (verb && words.length > 1) return `${verb} ${withArticle(words.slice(0, -1).join(" "))}`;
  const kind = actionKind(action);
  if (kind === "create") return `created ${withArticle(label)}`;
  if (kind === "update") return `updated ${label}`;
  if (kind === "delete") return `removed ${label}`;
  // One word we know nothing about stays as plain as it was; a longer id at least names what happened.
  return words.length > 1 ? `performed "${label}"` : "performed an action";
}

const GREEN = 0x3ba55d;
const RED = 0xed4245;
const AMBER = 0xf0b232;

// What kind of logbook entry it was: the word for it and the colour of its embed.
const ENTRY_KINDS: Record<string, { label: string; colour?: number }> = {
  warning: { label: "Warning", colour: 0xffa500 },
  promotion: { label: "Promotion", colour: GREEN },
  demotion: { label: "Demotion", colour: 0xe67e22 },
  termination: { label: "Termination", colour: RED },
  note: { label: "Note", colour: BLURPLE },
  rank_change: { label: "Rank Change", colour: AMBER },
  resignation: { label: "Resignation" },
};

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}...` : text);

/** Puts the person (and, for footers, the action) into a message template written by the workspace. */
const fillTemplate = (text: string, user: string, action?: string) => {
  const named = text.replace("{user}", user).replace("{username}", user);
  return action === undefined ? named : named.replace("{action}", action);
};

/** The colour of an event's embed: the workspace's own choice, then by entry type, then by what kind of change it was. */
function colourFor(action: string, details: any, chosen?: string | null): number {
  if (chosen) return parseInt(chosen.replace("#", ""), 16);
  if (action === "userbook.create" && details?.type) return ENTRY_KINDS[details.type]?.colour ?? BLURPLE;
  if (action === "notice.approve") return GREEN;
  if (action === "notice.deny" || /delete|remove/.test(action)) return RED;
  if (/create|add/.test(action)) return GREEN;
  if (/update|edit/.test(action)) return AMBER;
  return BLURPLE;
}

type Field = NonNullable<DiscordMessage["fields"]>[number];

/** Keys whose values must never be posted to a Discord channel, whatever an action put in its details. */
const SENSITIVE = /secret|token|password|passwd|api[-_ ]?key|apikey|authorization|cookie|signature|hash|credential|private|webhook(url)?$/i;
const FIELD_VALUE_MAX = 1024;
const MAX_FIELDS = 12;

/** The details with anything sensitive taken out, all the way down. */
function withoutSecrets(v: unknown, depth = 0): unknown {
  if (Array.isArray(v)) return depth > 3 ? [] : v.map((x) => withoutSecrets(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 3) return {};
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => !SENSITIVE.test(k)).map(([k, x]) => [k, withoutSecrets(x, depth + 1)]));
  }
  return v;
}

/** A value nobody should have to read: a UUID, or a long numeric id. */
export const looksLikeId = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim()) || /^\d{15,}$/.test(v.trim());

/** "DRAFT" and "IN_REVIEW" as "Draft" and "In review": the database's words, put the way a person says them. */
export const readableValue = (v: string) => (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(v) && v.length > 1 ? (v.charAt(0) + v.slice(1).toLowerCase()).replace(/_/g, " ") : v);

const clipValue = (text: string) => (text.length > FIELD_VALUE_MAX ? `${text.slice(0, FIELD_VALUE_MAX - 1)}…` : text);

function factField(f: Fact): Field {
  if (f.kind === "change") return { name: f.label, value: clipValue(`${readableValue(f.before)} → ${readableValue(f.after)}`), inline: f.before.length + f.after.length < 40 };
  if (f.kind === "list") {
    const lines = [f.added.length ? `Added: ${f.added.join(", ")}` : "", f.removed.length ? `Removed: ${f.removed.join(", ")}` : ""].filter(Boolean);
    return { name: f.label, value: clipValue(lines.join("\n") || "No change"), inline: false };
  }
  return { name: f.label, value: clipValue(readableValue(f.value)), inline: f.value.length < 40 };
}

// Actions whose rows are written out by hand below: the generic rows would only repeat them.
const HAND_WRITTEN = /^(userbook\.create|document\.|session\.(create|delete)|wall\.post|notice\.)/;

/** Rows for every other action, from what its details hold: what changed, what it was about, who it was for. */
function genericFields(action: string, d: unknown): Field[] {
  const rows: Field[] = [];
  const clean = withoutSecrets(d);
  if (!HAND_WRITTEN.test(action) && clean && typeof clean === "object") rows.push(...describeDetails(clean).filter((f) => !(f.kind === "text" && looksLikeId(f.value))).map(factField));
  else if (!HAND_WRITTEN.test(action) && typeof clean === "string" && clean) rows.push({ name: "Details", value: clipValue(clean), inline: false });
  return rows;
}

/** The detail rows an event carries: what was changed, by whom, why. */
function detailFields(action: string, d: any): NonNullable<DiscordMessage["fields"]> {
  const rows: NonNullable<DiscordMessage["fields"]> = [];
  if (!d) return rows;
  if (action.includes("document") && d.name) rows.push({ name: "Document", value: d.name, inline: true });
  if (/^session\.(create|delete)/.test(action) && d.name) rows.push({ name: "Session", value: d.name, inline: true });
  if (action.includes("wall.post") && d.content) {
    rows.push({ name: "Content", value: shorten(d.content, 500), inline: false });
    if (d.hasImage) rows.push({ name: "Attachment", value: "Image attached", inline: true });
  }
  if (action.includes("role") && d.after && d.before) {
    const roles = (side: any) => (side.roles ? side.roles.join(", ") : "None");
    rows.push({ name: "Previous Roles", value: roles(d.before), inline: false }, { name: "New Roles", value: roles(d.after), inline: false });
  }
  if (action === "userbook.create") {
    if (d.type) rows.push({ name: "Type", value: ENTRY_KINDS[d.type]?.label || d.type, inline: true });
    if (d.targetUsername || d.userId) rows.push({ name: "Target User", value: d.targetUsername || String(d.userId), inline: true });
    if (d.reason) rows.push({ name: "Reason", value: shorten(d.reason, 1024), inline: false });
    if (d.rankNameBefore || d.rankNameAfter) rows.push({ name: "Rank Change", value: `${d.rankNameBefore || "N/A"} → ${d.rankNameAfter || "N/A"}`, inline: false });
  }
  if (action.startsWith("notice.") && d.before?.reason) rows.push({ name: "Reason", value: d.before.reason, inline: false });
  return rows;
}

/** The embed for one audit log event, in the words and colours the workspace chose (or the defaults). */
export function formatAuditEvent(
  action: string,
  userName: string,
  details: any,
  avatarUrl?: string,
  embed?: { title?: string | null; color?: string | null; footer?: string | null; thumbnail?: boolean },
  /** What the entry was about (a group, a role, a document name): stored on every audit entry, and shown when it isn't already in a row. */
  entity?: string | null,
): DiscordMessage {
  const entryKind = action === "userbook.create" && details?.type ? ENTRY_KINDS[details.type]?.label : undefined;
  const known = entryKind ? `${entryKind} logged` : ACTIONS[action]?.title;
  const readable = known || autoTitle(action);
  const fields = [...detailFields(action, details), ...genericFields(action, details)];
  const about = typeof entity === "string" && !looksLikeId(entity) ? entity.trim() : "";
  if (about && !fields.some((f) => f.value === about || f.value.includes(about))) fields.unshift({ name: "About", value: clipValue(about), inline: true });
  // Names the field the same way twice? Keep the first (the hand-written one).
  const seen = new Set<string>();
  const unique = fields.filter((f) => (seen.has(f.name.toLowerCase()) ? false : (seen.add(f.name.toLowerCase()), true))).slice(0, MAX_FIELDS);
  return {
    title: embed?.title ? fillTemplate(embed.title, userName).replace("{action}", known || action) : readable,
    description: `**${userName}** ${entryKind ? `logged a ${entryKind.toLowerCase()}${details?.targetUsername ? ` for **${details.targetUsername}**` : ""}` : getActionDescription(action)}`,
    color: colourFor(action, details, embed?.color),
    fields: unique,
    footer: { text: embed?.footer ? fillTemplate(embed.footer, userName, action) : FOOTERS.logs },
    thumbnail: embed?.thumbnail !== false && avatarUrl ? { url: avatarUrl } : undefined,
  };
}

/**
 * Posts one embed to a Discord webhook address: Rosterr's own "new workspace" announcement (DISCORD_WELCOME), not something a workspace
 * sets up. It goes as a Components V2 card like everything the bot sends (`with_components=true` lets a webhook carry one), with the
 * ordinary emoji: a webhook can't use the bot's own. If Discord refuses the card, the plain embed is sent. False when nothing could be sent.
 */
export async function sendWebhookEmbed(webhookUrl: string, embed: DiscordMessage): Promise<boolean> {
  const stamped = { ...embed, timestamp: embed.timestamp || new Date().toISOString() };
  const opts = { headers: { "Content-Type": "application/json" }, timeout: 5000 };
  const v2 = messageToV2({ embeds: [{ ...stamped, rr_icon: "rr_logo" }] });
  try {
    if (v2) {
      try {
        const url = new URL(webhookUrl);
        url.searchParams.set("with_components", "true");
        await axios.post(url.toString(), fillEmoji(v2[0], new Map()), opts);
        return true;
      } catch (err: any) {
        if (err?.response?.status !== 400) throw err;
      }
    }
    await axios.post(webhookUrl, { embeds: [stamped] }, opts);
    return true;
  } catch (error: any) {
    console.error("Failed to send Discord webhook:", error.message);
    return false;
  }
}

