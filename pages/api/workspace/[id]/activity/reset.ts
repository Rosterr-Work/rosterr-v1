import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getResetStart } from "@/utils/activity/resetStart";
import { buildHistory } from "@/utils/activity/period";
import { commitReset } from "@/utils/activity/reset";

// Ends the current activity period by hand: saves everyone's numbers to the history and starts a fresh period. (The scheduled reset does
// the same through the same two functions; see pages/api/cron/reset-activity.ts.)
export default withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = Number(req.query.id);
  try {
    const periodStart = await getResetStart(groupId);
    const periodEnd = new Date();
    const historyRecords = await buildHistory(groupId, periodStart, periodEnd);
    await commitReset({ workspaceGroupId: groupId, periodStart, periodEnd, resetById: req.session.userid, trigger: "manual", historyRecords });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[reset] manual reset failed for workspace ${groupId}:`, error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}, "reset_activity");
