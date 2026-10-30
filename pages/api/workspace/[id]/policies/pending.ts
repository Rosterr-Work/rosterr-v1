import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { pendingCount } from "@/utils/policies/mine";

// GET: how many policies are waiting for the signed-in person to agree (the red number on Docs).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    return res.status(200).json({ success: true, count: await pendingCount(parseInt(req.query.id as string, 10), req.session.userid) });
  } catch (error) {
    console.error("[policies] pending:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
