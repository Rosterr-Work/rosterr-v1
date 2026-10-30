import prisma from "@/utils/database";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// POST .../user/{userId}/activity/start { time }: starts an activity session at that UTC time, for someone with a role here.
export default publicRoute("POST", async ({ req, res, workspaceId }) => {
  const userId = userIdOf(String(req.query.userId ?? ""));
  if (!userId) return fail(res, 400, "Missing or invalid user ID");
  const time = req.body?.time;
  if (!time) return fail(res, 400, "Missing time (UTC ISO string)");
  const startTime = new Date(time);
  if (Number.isNaN(startTime.getTime())) return fail(res, 400, "Invalid time format. Provide a UTC ISO 8601 string.");
  if (startTime.getTime() > Date.now() + 5 * 60_000) return fail(res, 400, "The start time can't be in the future.");

  const user = await prisma.user.findFirst({ where: { userid: userId, roles: { some: { workspaceGroupId: workspaceId } } }, select: { userid: true } });
  if (!user) return fail(res, 404, "User not found in this workspace");
  const open = await prisma.playSession.findFirst({ where: { userId, workspaceGroupId: workspaceId, active: true }, select: { id: true } });
  if (open) return fail(res, 409, "User already has an active session in this workspace");
  const session = await prisma.playSession.create({ data: { userId, workspaceGroupId: workspaceId, active: true, startTime } });
  return res.status(200).json({ success: true, session: { id: session.id } });
});
