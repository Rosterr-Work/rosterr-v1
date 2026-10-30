import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { loadMine } from "@/utils/policies/mine";

// GET: the policies meant for the signed-in person, those they have agreed to and those still waiting.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.query.id) return res.status(400).json({ success: false, error: "Missing required fields" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const r = await loadMine(parseInt(req.query.id as string, 10), req.session.userid);
    if (r.status !== 200) return res.status(r.status).json({ success: false, error: r.error });
    return res.status(200).json({ success: true, acknowledgments: r.acknowledgments, pendingPolicies: r.pendingPolicies });
  } catch (error) {
    console.error("[policies] mine:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
