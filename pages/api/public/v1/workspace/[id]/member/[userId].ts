import prisma from "@/utils/database";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// GET .../member/{userId}: one member: their role, departments, when they joined and whether they are on approved leave right now.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const userId = userIdOf(String(req.query.userId ?? ""));
  if (!userId) return fail(res, 400, "Missing or invalid user ID");
  const now = new Date();
  const [member, away] = await Promise.all([
    prisma.membership.findUnique({
      where: { workspaceGroupId_userId: { workspaceGroupId: workspaceId, userId } },
      select: {
        joinDate: true,
        isAdmin: true,
        user: { select: { userid: true, username: true, picture: true, roles: { where: { workspaceGroupId: workspaceId }, select: { id: true, name: true, color: true } } } },
        departmentMembers: { select: { department: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.leaveNotice.findFirst({ where: { workspaceGroupId: workspaceId, userId, approved: true, revoked: false, startTime: { lte: now }, endTime: { gte: now } }, select: { id: true } }),
  ]);
  if (!member) return fail(res, 404, "Member not found");
  return res.status(200).json({
    success: true,
    member: {
      role: member.user.roles[0] ?? null,
      username: member.user.username,
      userId: Number(member.user.userid),
      thumbnail: member.user.picture,
      departments: member.departmentMembers.map((d) => d.department),
      joinDate: member.joinDate,
      isAdmin: member.isAdmin ?? false,
      onLeave: Boolean(away),
    },
  });
});
