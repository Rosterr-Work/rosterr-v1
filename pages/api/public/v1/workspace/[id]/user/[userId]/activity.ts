import { userActivity } from "@/utils/publicApi/activity";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// GET .../user/{userId}/activity?startDate=&endDate=&limit=: one person's activity sessions, adjustments and leave, between two dates.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const userId = userIdOf(String(req.query.userId ?? ""));
  if (!userId) return fail(res, 400, "Missing or invalid user ID");
  const { startDate, endDate } = req.query;
  const since = startDate ? new Date(String(startDate)) : undefined;
  const until = endDate ? new Date(String(endDate)) : undefined;
  if ((since && Number.isNaN(since.getTime())) || (until && Number.isNaN(until.getTime()))) return fail(res, 400, "startDate and endDate must be valid dates");
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(req.query.limit ?? "50")) || 50));
  const a = await userActivity(workspaceId, userId, { since, until, limit });
  if (!a) return fail(res, 404, "User not found in this workspace");
  return res.status(200).json({
    success: true,
    user: a.user,
    activity: { sessions: a.sessions, totalSessions: a.totalSessions, totalActivityTime: a.totalActivityTime, averageSessionLength: a.averageSessionLength, adjustments: a.adjustments, notices: a.notices },
  });
});
