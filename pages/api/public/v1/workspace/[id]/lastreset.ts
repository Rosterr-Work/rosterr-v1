import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";
import { nextResetAt } from "@/utils/activity/schedule";
import { publicRoute } from "@/utils/publicApi/route";

// GET .../lastreset: when activity was last reset, the schedule, and when the next automatic reset will be.
export default publicRoute("GET", async ({ res, workspaceId }) => {
  const [last, lastAuto, schedule] = await Promise.all([
    prisma.activityPeriodReset.findFirst({ where: { workspaceGroupId: workspaceId }, orderBy: { resetAt: "desc" }, select: { resetAt: true, previousPeriodStart: true, previousPeriodEnd: true } }),
    prisma.activityPeriodReset.findFirst({ where: { workspaceGroupId: workspaceId, resetById: null }, orderBy: { resetAt: "desc" }, select: { resetAt: true } }),
    getConfig("activity_reset_schedule", workspaceId) as Promise<any>,
  ]);
  const s = schedule || {};
  return res.status(200).json({
    success: true,
    reset: { lastResetAt: last?.resetAt || null, previousPeriodStart: last?.previousPeriodStart || null, previousPeriodEnd: last?.previousPeriodEnd || null },
    schedule: { enabled: Boolean(s.enabled), day: s.day || null, frequency: s.frequency || null },
    nextResetAt: nextResetAt(new Date(), s, lastAuto?.resetAt || null),
  });
});
