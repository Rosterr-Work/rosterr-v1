import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";
import { getResetStart } from "@/utils/activity/resetStart";
import { cronGuard } from "@/utils/cron/guard";
import { buildHistory } from "@/utils/activity/period";
import { commitReset } from "@/utils/activity/reset";
import { resetDue } from "@/utils/activity/schedule";

// Run about once an hour: ends the activity period for each workspace whose automatic reset is due today (see utils/activity/schedule).
// Resets done by hand have a person on them and never count as the automatic one.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!cronGuard(req, res)) return;

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const results: { workspaceId: string; workspaceName: string; success: boolean; error?: string }[] = [];
  try {
    const workspaces = await prisma.workspace.findMany({ select: { groupId: true, groupName: true } });
    for (const w of workspaces) {
      try {
        const schedule = (await getConfig("activity_reset_schedule", w.groupId)) as any;
        if (!schedule?.enabled) continue;
        const [today, last] = await Promise.all([
          prisma.activityPeriodReset.findFirst({ where: { workspaceGroupId: w.groupId, resetById: null, resetAt: { gte: dayStart, lte: dayEnd } }, select: { id: true } }),
          prisma.activityPeriodReset.findFirst({ where: { workspaceGroupId: w.groupId, resetById: null }, orderBy: { resetAt: "desc" }, select: { resetAt: true } }),
        ]);
        if (!resetDue(schedule, now, { autoResetToday: Boolean(today), lastAutoResetAt: last?.resetAt ?? null })) continue;

        const periodStart = await getResetStart(w.groupId);
        const periodEnd = new Date();
        const historyRecords = await buildHistory(w.groupId, periodStart, periodEnd);
        const done = await commitReset({ workspaceGroupId: w.groupId, periodStart, periodEnd, resetById: null, trigger: "scheduled", historyRecords });
        console.log(`[reset] scheduled reset ${done.id} for workspace ${w.groupId}:`, JSON.stringify(done.summary));
        results.push({ workspaceId: String(w.groupId), workspaceName: w.groupName || `Workspace ${w.groupId}`, success: true });
      } catch (error: any) {
        results.push({ workspaceId: String(w.groupId), workspaceName: w.groupName || `Workspace ${w.groupId}`, success: false, error: error?.message ?? "Failed" });
      }
    }
    return res.status(200).json({ success: true, message: `Processed ${workspaces.length} workspaces`, results, resetCount: results.filter((r) => r.success).length });
  } catch (error) {
    console.error("[reset] scheduled reset failed:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
