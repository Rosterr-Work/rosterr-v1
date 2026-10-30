import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { loadPastPeriods } from "@/utils/profile/pastPeriods";
import { maySeeSessions } from "@/utils/profile/sessionHistory";

// GET ?periodEnd=: a person's saved activity periods, or the one that ended at that time. Their own, or with the right to view member profiles.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const viewer = req.session.userid;
  if (!viewer) return res.status(401).json({ success: false, error: "Unauthorized" });
  const uid = String(req.query.userId ?? "");
  if (!/^\d{1,19}$/.test(uid)) return res.status(400).json({ success: false, error: "Invalid user id" });
  const groupId = parseInt(req.query.id as string, 10);
  let periodEnd: Date | undefined;
  if (req.query.periodEnd) {
    periodEnd = new Date(String(req.query.periodEnd));
    if (Number.isNaN(periodEnd.getTime())) return res.status(400).json({ success: false, error: "periodEnd must be a date" });
  }
  try {
    if (!(await maySeeSessions(groupId, viewer, BigInt(uid)))) return res.status(401).json({ success: false, error: "Unauthorized" });
    const data = await loadPastPeriods(groupId, BigInt(uid), periodEnd);
    if (!data) return res.status(404).json({ success: false, error: periodEnd ? "No activity history found for this period" : "No activity history found for this user" });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[activity] history:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch user activity history" });
  }
});
