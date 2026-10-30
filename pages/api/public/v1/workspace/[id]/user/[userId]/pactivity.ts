import { userActivity } from "@/utils/publicApi/activity";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { userIdOf } from "@/utils/publicApi/sessions";

// GET .../user/{userId}/pactivity?limit=: one person's activity in the current period (since the last reset).
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const userId = userIdOf(String(req.query.userId ?? ""));
  if (!userId) return fail(res, 400, "Missing or invalid user ID");
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(req.query.limit ?? "50")) || 50));
  const a = await userActivity(workspaceId, userId, { sinceReset: true, limit });
  if (!a) return fail(res, 404, "User not found in this workspace");
  return res.status(200).json({
    success: true,
    user: a.user,
    resetInfo: { lastResetDate: a.lastReset?.resetAt || null, resetById: a.lastReset?.resetById ? Number(a.lastReset.resetById) : null },
    activity: {
      sessions: a.sessions,
      totalSessions: a.totalSessions,
      totalActivityTime: a.totalActivityTime,
      averageSessionLength: a.averageSessionLength,
      totalMessages: a.totalMessages,
      totalIdleTime: a.totalIdleTime,
      adjustments: a.adjustments,
      notices: a.notices,
    },
  });
});
