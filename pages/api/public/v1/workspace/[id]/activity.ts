import prisma from "@/utils/database";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// GET .../activity: activity sessions (when someone was in the game), newest first. Filter with userId, startDate and endDate; page with page and limit (up to 100).
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const { startDate, endDate, userId } = req.query;
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "50")) || 50));
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1")) || 1);

  const where: any = { workspaceGroupId: workspaceId, archived: { not: true } };
  if (userId) {
    const id = userIdOf(String(userId));
    if (!id) return fail(res, 400, "userId must be a valid user ID");
    where.userId = id;
  }
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = new Date(String(startDate));
    if (endDate) where.startTime.lte = new Date(String(endDate));
    if (Object.values(where.startTime).some((d) => Number.isNaN((d as Date).getTime()))) return fail(res, 400, "startDate and endDate must be valid dates");
  }

  const [rows, total] = await prisma.$transaction([
    prisma.playSession.findMany({ where, include: { user: { select: { userid: true, username: true, picture: true } } }, orderBy: { startTime: "desc" }, take: limit, skip: (page - 1) * limit }),
    prisma.playSession.count({ where }),
  ]);
  return res.status(200).json({
    success: true,
    sessions: rows.map((s) => ({
      id: s.id,
      userId: Number(s.userId),
      username: s.user.username,
      active: s.active,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.endTime ? Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : null,
      messages: s.messages,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
});
