import { Prisma } from "@prisma/client";
import prisma from "./database";
import { getRemoteAvatarUrl } from "./avatarManager";
import { getUsername } from "./userinfoEngine";
import { auditEmbed, auditLinks, auditWanted, configOf, type AuditConfig } from "./discordBot/channelPosts";
import { post } from "./discordBot/post";
import { onLogbookEntry } from "./discordBot/triggers";

// The audit log: who did what in a workspace. Each entry is written to the database, then mirrored (never blocking, never failing the
// action) to the audit channel the workspace chose for its Discord bot, if it did.

export type AuditDetails = Record<string, any>;

/** Entries are kept for 30 days; clearing older ones runs at most once an hour for each workspace. */
export const AUDIT_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_EVERY_MS = 60 * 60 * 1000;
const lastPrune = new Map<string, number>();

export async function pruneAudit(workspaceGroupId: bigint | number, now: number = Date.now()) {
  const key = String(workspaceGroupId);
  const before = lastPrune.get(key);
  if (before !== undefined && now - before < PRUNE_EVERY_MS) return;
  lastPrune.set(key, now);
  await prisma.auditEntry.deleteMany({ where: { workspaceGroupId, createdAt: { lt: new Date(now - AUDIT_KEEP_MS) } } });
}

async function nameOf(userId: number | bigint): Promise<string | null> {
  const row = await prisma.user.findUnique({ where: { userid: BigInt(userId) }, select: { username: true } }).catch(() => null);
  if (row?.username) return row.username;
  return (await getUsername(Number(userId)).catch(() => null)) || null;
}

/** The audit channel of the workspace's Discord bot: the changes the workspace chose, in the words and colours it chose. */
async function mirrorToDiscord(groupId: bigint | number, userId: number | null, action: string, details?: AuditDetails, entity?: string) {
  try {
    const row = await prisma.discordChannelPost.findUnique({ where: { workspaceGroupId_kind: { workspaceGroupId: BigInt(groupId), kind: "AUDIT" } }, select: { enabled: true, config: true } });
    if (!row?.enabled) return;
    const config = configOf("AUDIT", row.config) as AuditConfig;
    if (!auditWanted(config, action)) return;

    const actor = userId ? (await nameOf(userId)) || "Unknown" : "System";
    const avatar = userId ? await getRemoteAvatarUrl(userId).catch(() => undefined) : undefined;
    const shown = details ? { ...details } : details;
    if (action === "userbook.create" && shown?.userId) {
      const target = await nameOf(shown.userId);
      if (target) shown.targetUsername = target;
    }
    await post(groupId, "AUDIT", [auditEmbed(config, action, actor, shown, avatar, entity)], { v2: { links: auditLinks(groupId, action, shown) } });
  } catch (error: any) {
    console.error("[Discord] Failed to send audit event:", error);
  }
}

export async function logAudit(workspaceGroupId: bigint | number, userId: number | null, action: string, entity?: string, details?: AuditDetails) {
  try {
    await prisma.auditEntry.create({
      data: { workspaceGroupId, userId: userId ? BigInt(userId) : undefined, action, entity: entity || null, details: details ?? Prisma.JsonNull },
    });
    await pruneAudit(workspaceGroupId);
    mirrorToDiscord(workspaceGroupId, userId, action, details, entity).catch(() => {});
    if (action === "userbook.create") onLogbookEntry(workspaceGroupId, details);
    // The member an admin acted on hears about it by email too, if they and the workspace said yes. Never blocks.
    void import("./email/adminActions").then((m) => m.emailForWorkspaceAction(workspaceGroupId, userId, action, details)).catch(() => {});
  } catch (e) {
    console.error("[Audit] Failed to log audit", e);
  }
}

/** Values safe to send as JSON: big numbers as text and dates as ISO strings, all the way down. */
const plain = (v: any): any => {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
};

export async function queryAudit(workspaceGroupId: bigint | number, opts: { userId?: number; userIds?: number[]; action?: string; search?: string; from?: Date; to?: Date; skip?: number; take?: number } = {}) {
  const where: any = { workspaceGroupId };
  if (opts.userId) where.userId = BigInt(opts.userId);
  else if (opts.userIds) where.userId = { in: opts.userIds.map((u) => BigInt(u)) };
  if (opts.from || opts.to) where.createdAt = { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) };
  if (opts.action) where.action = opts.action;
  if (opts.search) where.OR = [{ action: { contains: opts.search } }, { entity: { contains: opts.search } }];

  try {
    const [rows, total] = await Promise.all([
      prisma.auditEntry.findMany({ where, orderBy: { createdAt: "desc" }, skip: opts.skip || 0, take: opts.take || 50 }),
      prisma.auditEntry.count({ where }),
    ]);
    return { rows: rows.map(plain), total };
  } catch (e) {
    console.error("[Audit] Error querying audits", e);
    throw e;
  }
}

export default { logAudit, queryAudit };
