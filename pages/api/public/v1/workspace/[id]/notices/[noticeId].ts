import prisma from "@/utils/database";
import { decideNotice, revokeNotice } from "@/utils/notices/service";
import { MAX_COMMENT, readMoment } from "@/utils/notices/rules";
import { noticeOut, ownerMay } from "@/utils/publicApi/notices";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET .../notices/{id}: one notice. PATCH { approved?, reviewComment?, endTime?, revoked? }: review it or change it. DELETE: stop it now.
const person = { select: { userid: true, username: true, picture: true } } as const;

export default publicRoute(["GET", "PATCH", "DELETE"], async ({ req, res, workspaceId, key }) => {
  const id = String(req.query.noticeId ?? "");
  const owner = BigInt(key.createdById);
  const find = () => prisma.leaveNotice.findFirst({ where: { id, workspaceGroupId: workspaceId }, include: { user: person } });

  if (req.method === "GET") {
    const notice = await find();
    if (!notice) return fail(res, 404, "Notice not found");
    return res.status(200).json({ success: true, notice: noticeOut(notice, { comment: true }) });
  }

  if (req.method === "DELETE") {
    if (!(await ownerMay(owner, workspaceId, ["manage_notices"]))) return fail(res, 403, "The owner of this API key is not allowed to stop notices.");
    const done = await revokeNotice({ groupId: workspaceId, actorId: owner, noticeId: id, endNow: true });
    if (!done.ok) return fail(res, done.status, done.error);
    return res.status(200).json({ success: true, message: "Notice stopped successfully", notice: { id: done.notice.id, userId: Number(done.notice.userId), endTime: done.notice.endTime } });
  }

  // PATCH
  const { approved, reviewComment, endTime, revoked } = req.body ?? {};
  const existing = await find();
  if (!existing) return fail(res, 404, "Notice not found");
  const reviewing = typeof approved === "boolean";
  if (reviewing && !(await ownerMay(owner, workspaceId, ["approve_notices", "manage_notices"]))) return fail(res, 403, "The owner of this API key is not allowed to review notices.");
  if ((typeof revoked === "boolean" || endTime !== undefined) && !(await ownerMay(owner, workspaceId, ["manage_notices"]))) return fail(res, 403, "The owner of this API key is not allowed to change notices.");

  const changes: Record<string, unknown> = {};
  if (endTime !== undefined) {
    const end = endTime ? readMoment(endTime) : null;
    if (endTime && !end) return fail(res, 400, "endTime must be a valid date");
    if (end && end <= existing.startTime) return fail(res, 400, "End time must be after start time");
    changes.endTime = end;
  }
  if (typeof revoked === "boolean") Object.assign(changes, revoked ? { revoked: true, revokedAt: new Date(), revokedByUserId: owner } : { revoked: false, revokedAt: null, revokedByUserId: null });
  if (reviewComment !== undefined && !reviewing) changes.reviewComment = typeof reviewComment === "string" ? reviewComment.slice(0, MAX_COMMENT) : null;
  if (Object.keys(changes).length > 0) await prisma.leaveNotice.update({ where: { id }, data: changes as any });
  if (reviewing) {
    const done = await decideNotice({ groupId: workspaceId, reviewerId: owner, noticeId: id, approve: approved, comment: reviewComment });
    if (!done.ok) return fail(res, done.status, done.error);
  }
  const notice = await find();
  return res.status(200).json({ success: true, notice: noticeOut(notice!, { comment: true }) });
});
