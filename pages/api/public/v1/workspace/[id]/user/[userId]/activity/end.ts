import prisma from "@/utils/database";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// POST .../user/{userId}/activity/end { time }: ends their open activity session at that UTC time.
export default publicRoute("POST", async ({ req, res, workspaceId }) => {
  const userId = userIdOf(String(req.query.userId ?? ""));
  if (!userId) return fail(res, 400, "Missing or invalid user ID");
  const time = req.body?.time;
  if (!time) return fail(res, 400, "Missing time (UTC ISO string)");
  const endTime = new Date(time);
  if (Number.isNaN(endTime.getTime())) return fail(res, 400, "Invalid time format. Provide a UTC ISO 8601 string.");

  const open = await prisma.playSession.findFirst({ where: { userId, workspaceGroupId: workspaceId, active: true } });
  if (!open) return fail(res, 404, "No active session found for this user in this workspace");
  if (endTime <= open.startTime) return fail(res, 400, "End time must be after the session start time");
  if (endTime.getTime() > Date.now() + 5 * 60_000) return fail(res, 400, "The end time can't be in the future.");
  const session = await prisma.playSession.update({ where: { id: open.id }, data: { active: false, endTime } });
  return res.status(200).json({ success: true, session: { id: session.id } });
});
