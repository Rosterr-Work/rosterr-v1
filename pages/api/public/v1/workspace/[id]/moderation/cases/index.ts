import { creatorMayActAs, CANT_ACT_AS } from "@/utils/publicApi/actAs";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { isCaseStatus, CASE_STATUSES } from "@/utils/moderation/caseRules";
import { ACTIONS, isAction } from "@/utils/moderation/templates";
import { createCase } from "@/utils/moderation/service";
import prisma from "@/utils/database";
import { idOf } from "@/utils/moderation/caseRules";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET .../moderation/cases?status=&action=&targetUserId=&search=&page=: cases, newest first, 20 a page.
// POST .../moderation/cases { targetUserId, authorUserId, reason, action?, status?, ... }: opens a case as `authorUserId`, who has to be in the
// workspace and allowed to create cases.
const PAGE_SIZE = 20;

export default publicRoute(["GET", "POST"], async ({ req, res, workspaceId }) => {
  const groupId = BigInt(workspaceId);

  if (req.method === "GET") {
    const { page = "1", search, status, action, targetUserId } = req.query;
    const where: any = { workspaceGroupId: groupId };
    if (status) {
      if (!isCaseStatus(status)) return fail(res, 400, `status must be one of: ${CASE_STATUSES.join(", ")}`);
      where.status = status;
    }
    if (action) {
      if (!isAction(action)) return fail(res, 400, `action must be one of: ${ACTIONS.join(", ")}`);
      where.action = action;
    }
    if (targetUserId) {
      const uid = idOf(String(targetUserId));
      if (!uid) return fail(res, 400, "Invalid targetUserId");
      where.targetUserId = uid;
    }
    if (typeof search === "string" && search.trim()) where.OR = [{ targetUsername: { contains: search.trim() } }, { reason: { contains: search.trim() } }];
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const [cases, total] = await Promise.all([
      (prisma.moderationRecord.findMany as any)({
        where,
        select: { id: true, targetUserId: true, targetUsername: true, createdBy: true, reason: true, status: true, action: true, isPermanent: true, expiresAt: true, createdAt: true, resolvedAt: true, revokedAt: true, placeIds: true },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }) as Promise<any[]>,
      prisma.moderationRecord.count({ where }),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        cases: cases.map((c) => ({ ...c, targetUserId: Number(c.targetUserId), createdBy: Number(c.createdBy), placeIds: (c.placeIds ?? []).map(String) })),
        pagination: { total, page: pageNum, limit: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) },
      },
    });
  }

  const b = req.body ?? {};
  const author = idOf(b.authorUserId);
  if (!b.targetUserId || !b.authorUserId || !b.reason) return fail(res, 400, "targetUserId, authorUserId, and reason are required");
  if (!author) return fail(res, 400, "Invalid authorUserId");
  if (!(await creatorMayActAs(workspaceId, author))) return fail(res, 403, CANT_ACT_AS);
  const access = await loadAccess(author, workspaceId);
  if (!access || !allows(access, "create_moderation_cases")) return fail(res, 403, "That person isn't allowed to create moderation cases in this workspace.");
  const made = await createCase({ groupId, actorId: author, body: b, via: "api" });
  if (!made.ok) return fail(res, made.status, made.error);
  const c = made.case;
  return res.status(201).json({
    success: true,
    data: {
      id: c.id,
      targetUserId: Number(c.targetUserId),
      targetUsername: c.targetUsername,
      authorUserId: Number(c.createdBy),
      reason: c.reason,
      description: c.description,
      status: c.status,
      action: c.action,
      publicNote: c.publicNote,
      banDuration: c.banDuration,
      isPermanent: c.isPermanent,
      expiresAt: c.expiresAt,
      placeIds: (c.placeIds ?? []).map(String),
      createdAt: c.createdAt,
    },
  });
});
