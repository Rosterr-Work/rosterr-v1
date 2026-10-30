import prisma from "@/utils/database";
import { isStatus, statusWhere } from "@/utils/notices/rules";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// GET .../notices/user/{userId}?status=&from=&to=: one person's notices, newest first.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const userId = userIdOf(String(req.query.userId ?? ""));
  if (!userId) return fail(res, 400, "Missing or invalid user ID");
  const { status, from, to } = req.query;
  if (status !== undefined && !isStatus(status)) return fail(res, 400, "status must be pending, approved, rejected or active");
  const where: any = { workspaceGroupId: workspaceId, userId, ...statusWhere(isStatus(status) ? status : undefined) };
  if (from || to) {
    const start = from ? new Date(String(from)) : null;
    const end = to ? new Date(String(to)) : null;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return fail(res, 400, "from and to must be valid dates");
    where.startTime = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
  }
  const [notices, user] = await Promise.all([
    prisma.leaveNotice.findMany({ where, orderBy: { startTime: "desc" } }),
    prisma.user.findUnique({ where: { userid: userId }, select: { userid: true, username: true, picture: true } }),
  ]);
  if (!user) return fail(res, 404, "User not found");
  return res.status(200).json({
    success: true,
    user: { userId: Number(user.userid), username: user.username, thumbnail: user.picture },
    notices: notices.map((n) => ({ id: n.id, startTime: n.startTime, endTime: n.endTime, reason: n.reason, approved: n.approved, reviewed: n.reviewed, revoked: n.revoked, reviewComment: n.reviewComment })),
    total: notices.length,
  });
});
