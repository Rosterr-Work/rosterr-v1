import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { clampDays, loadNewMembers } from "@/utils/home/data";

// The New to the Team box: who joined in the last week (?days up to 30).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  return res.status(200).json({ success: true, members: await loadNewMembers(parseInt(String(req.query.id), 10), clampDays(req.query.days)) });
});
