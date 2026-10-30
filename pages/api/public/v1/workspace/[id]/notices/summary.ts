import prisma from "@/utils/database";
import { publicRoute } from "@/utils/publicApi/route";

// GET .../notices/summary: how many notices there are, waiting, approved, turned down and running now.
export default publicRoute("GET", async ({ res, workspaceId }) => {
  const g = { workspaceGroupId: workspaceId };
  const now = new Date();
  const [total, pending, approved, rejected, active] = await Promise.all([
    prisma.leaveNotice.count({ where: g }),
    prisma.leaveNotice.count({ where: { ...g, reviewed: false } }),
    prisma.leaveNotice.count({ where: { ...g, approved: true, reviewed: true } }),
    prisma.leaveNotice.count({ where: { ...g, approved: false, reviewed: true } }),
    prisma.leaveNotice.count({ where: { ...g, OR: [{ endTime: { gte: now } }, { endTime: null }], revoked: false, approved: true } }),
  ]);
  return res.status(200).json({ success: true, summary: { total, pending, approved, rejected, active } });
});
