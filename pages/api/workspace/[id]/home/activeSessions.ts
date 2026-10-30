import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { dayFrom, loadTodaysSessions } from "@/utils/home/data";

// The Sessions box: what is on now, or the next one today, of the kinds this person may see. ?startDate and ?endDate are the day in
// the browser's own clock.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const day = dayFrom(req.query);
  if (!day) return res.status(400).json({ success: false, error: "Those dates aren't valid" });
  const found = await loadTodaysSessions(parseInt(String(req.query.id), 10), req.session.userid as number, day);
  if (!found) return res.status(403).json({ success: false, error: "Unauthorized" });
  return res.status(200).json({ success: true, ...found });
});
