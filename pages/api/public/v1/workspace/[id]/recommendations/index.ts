import prisma from "@/utils/database";
import { readPaging } from "@/utils/publicApi/paging";
import { actingAs, recommendationOut } from "@/utils/publicApi/recommendations";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";
import { readStatus } from "@/utils/recommendations/rules";
import { create } from "@/utils/recommendations/service";

// GET .../recommendations?status=&targetUserId=&createdById=&sortBy=createdAt|updatedAt&sortOrder=&limit=&offset=
// POST .../recommendations { targetUserId, targetUsername, targetPicture?, reason, createdById, createdByName? }: made as `createdById`, who has
// to be in the workspace and allowed to post recommendations.
const votes = { select: { userId: true, createdAt: true } } as const;

export default publicRoute(["GET", "POST"], async ({ req, res, workspaceId }) => {
  if (req.method === "GET") {
    const { status, targetUserId, createdById, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const paging = readPaging(req.query);
    if (!paging) return fail(res, 400, "limit and offset must be valid numbers");
    const where: any = { workspaceGroupId: workspaceId };
    if (status) {
      const s = readStatus(status);
      if (!s) return fail(res, 400, "status must be active, approved, rejected or archived");
      where.status = s;
    }
    for (const [field, raw] of [["targetUserId", targetUserId], ["createdById", createdById]] as const) {
      if (!raw) continue;
      const id = userIdOf(String(raw));
      if (!id) return fail(res, 400, `${field} must be a valid user ID`);
      where[field] = id;
    }
    const orderBy = { [sortBy === "updatedAt" ? "updatedAt" : "createdAt"]: sortOrder === "asc" ? "asc" : "desc" };
    const [rows, total] = await Promise.all([
      prisma.staffRecommendation.findMany({ where, include: { votes, comments: { select: { id: true } } }, orderBy, take: paging.limit, skip: paging.offset }),
      prisma.staffRecommendation.count({ where }),
    ]);
    return res.status(200).json({ success: true, recommendations: rows.map((r) => recommendationOut(r as any, { votes: "list" })), total, limit: paging.limit, offset: paging.offset });
  }

  const b = req.body ?? {};
  const target = userIdOf(b.targetUserId);
  if (!target || !b.targetUsername || !b.reason || !b.createdById) return fail(res, 400, "Missing required fields: targetUserId, targetUsername, reason, createdById");
  const who = await actingAs(workspaceId, b.createdById);
  if (!who.ok) return fail(res, 400, who.error);
  const done = await create({ groupId: workspaceId, actor: who.actor, input: { targetUserId: target, targetUsername: String(b.targetUsername), targetPicture: typeof b.targetPicture === "string" ? b.targetPicture.slice(0, 500) : null, reason: b.reason } });
  if (!done.ok) return fail(res, done.status, done.error);
  return res.status(201).json({ success: true, recommendation: recommendationOut(done.recommendation, { votes: "list" }) });
});
