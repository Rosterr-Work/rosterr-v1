import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { idOf } from "@/utils/moderation/caseRules";
import { groupOf, sendData } from "@/utils/moderation/http";

// GET: the moderation log, newest first (filter by action, actionBy, targetUser, caseId and a date range; up to 200 a page).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const q = req.query;
  const where: any = { workspaceGroupId: groupOf(req) };
  if (typeof q.action === "string" && q.action) where.action = q.action;
  for (const field of ["actionBy", "targetUser"] as const) {
    if (!q[field]) continue;
    const id = idOf(String(q[field]));
    if (!id) return res.status(400).json({ success: false, error: `${field} is not a valid id` });
    where[field] = id;
  }
  if (typeof q.caseId === "string" && q.caseId) where.caseId = q.caseId;
  if (q.startDate || q.endDate) {
    const from = q.startDate ? new Date(String(q.startDate)) : null;
    const to = q.endDate ? new Date(String(q.endDate)) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return res.status(400).json({ success: false, error: "startDate and endDate must be dates" });
    where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }
  const page = Math.max(1, parseInt(String(q.page ?? "1")) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(q.limit ?? "100")) || 100));
  try {
    const [logs, total] = await Promise.all([
      prisma.moderationHistoryEntry.findMany({ where, include: { actor: { select: { userid: true, username: true, picture: true, displayName: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.moderationHistoryEntry.count({ where }),
    ]);
    return sendData(res, { logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("[moderation] logs:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch moderation logs" });
  }
}, ["view_moderation"]);
