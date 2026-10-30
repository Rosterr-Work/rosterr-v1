import prisma from "@/utils/database";
import { isStatus, statusWhere } from "@/utils/notices/rules";
import { recordNotice } from "@/utils/notices/service";
import { noticeOut, ownerMay } from "@/utils/publicApi/notices";
import { readPaging } from "@/utils/publicApi/paging";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// GET .../notices?status=&userId=&from=&to=&limit=&offset=: notices, newest first.
// POST .../notices { userId, startTime, endTime?, reason, reviewed? }: records leave for someone. Approved at once unless `reviewed: false`
// (then it waits for someone to review it). The key's owner needs record_notices (or create_notices for one that waits).
export default publicRoute(["GET", "POST"], async ({ req, res, workspaceId, key }) => {
  if (req.method === "GET") {
    const { status, userId, from, to } = req.query;
    const paging = readPaging(req.query);
    if (!paging) return fail(res, 400, "limit and offset must be valid numbers");
    if (status !== undefined && !isStatus(status)) return fail(res, 400, "status must be pending, approved, rejected or active");
    const where: any = { workspaceGroupId: workspaceId, ...statusWhere(isStatus(status) ? status : undefined) };
    if (userId) {
      const id = userIdOf(String(userId));
      if (!id) return fail(res, 400, "userId must be a valid user ID");
      where.userId = id;
    }
    if (from || to) {
      const start = from ? new Date(String(from)) : null;
      const end = to ? new Date(String(to)) : null;
      if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return fail(res, 400, "from and to must be valid dates");
      where.startTime = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
    }
    const [rows, total] = await Promise.all([
      prisma.leaveNotice.findMany({ where, include: { user: { select: { userid: true, username: true, picture: true } } }, orderBy: { startTime: "desc" }, take: paging.limit, skip: paging.offset }),
      prisma.leaveNotice.count({ where }),
    ]);
    return res.status(200).json({ success: true, notices: rows.map((n) => noticeOut(n, { comment: true })), total, limit: paging.limit, offset: paging.offset });
  }

  const b = req.body ?? {};
  const target = userIdOf(b.userId);
  if (!target || !b.startTime || !b.reason) return fail(res, 400, "Missing required fields: userId, startTime, reason");
  const pending = b.reviewed === false;
  const owner = BigInt(key.createdById);
  if (!(await ownerMay(owner, workspaceId, pending ? ["create_notices", "record_notices"] : ["record_notices"]))) return fail(res, 403, "The owner of this API key is not allowed to record notices.");
  const made = await recordNotice({ groupId: workspaceId, actorId: owner, targetId: target, body: b, pending, openEnded: true });
  if (!made.ok) return fail(res, made.status, made.error);
  const user = await prisma.user.findUnique({ where: { userid: target }, select: { userid: true, username: true, picture: true } });
  return res.status(201).json({ success: true, notice: noticeOut({ ...made.notice, user }) });
});
