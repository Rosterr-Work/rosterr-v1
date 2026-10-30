import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadBirthdays } from "@/utils/home/data";

// The Birthdays box: everyone's next birthday, soonest first (only those within ?days when given). Reading it changes nothing.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const days = req.query.days === undefined ? undefined : Math.min(366, Math.max(0, parseInt(String(req.query.days), 10) || 0));
  return res.status(200).json({ success: true, birthdays: await loadBirthdays(parseInt(String(req.query.id), 10), new Date(), days) });
});
