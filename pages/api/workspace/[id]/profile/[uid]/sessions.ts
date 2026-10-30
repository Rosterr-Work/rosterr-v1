import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { loadSessionHistory, maySeeSessions } from "@/utils/profile/sessionHistory";

// GET ?periodStart=&periodEnd=: the sessions a person hosted or took part in this period, or in a saved period. Their own, or with
// the right to view member profiles.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const viewer = req.session.userid;
  if (!viewer) return res.status(401).json({ success: false, error: "Unauthorized" });
  const uid = String(req.query.uid ?? "");
  if (!/^\d{1,19}$/.test(uid)) return res.status(400).json({ success: false, error: "Invalid user id" });
  const groupId = parseInt(req.query.id as string, 10);
  const target = BigInt(uid);

  let period: { start: Date; end: Date } | null = null;
  if (req.query.periodStart && req.query.periodEnd) {
    const start = new Date(String(req.query.periodStart));
    const end = new Date(String(req.query.periodEnd));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return res.status(400).json({ success: false, error: "periodStart and periodEnd must be dates" });
    period = { start, end };
  }
  try {
    if (!(await maySeeSessions(groupId, viewer, target))) return res.status(401).json({ success: false, error: "Unauthorized" });
    return res.status(200).json({ success: true, sessions: await loadSessionHistory(groupId, target, period) });
  } catch (error) {
    console.error("[profile] session history:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch session history" });
  }
});
