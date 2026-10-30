import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { withActivityApiRateLimit } from "@/utils/prtl";
import { findActivityConfigByKey } from "@/utils/activityAuth";
import { endMany } from "@/utils/activity/ingest";

// The in-game activity package when a server shuts down: POST { sessions: [{ userid, idleTime?, messages? }] } closes each person's session.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.headers.authorization) return res.status(400).json({ success: false, error: "Authorization key missing" });
  const sessions = req.body?.sessions;
  if (!Array.isArray(sessions)) return res.status(400).json({ success: false, error: "Sessions array is required" });
  try {
    const config = await findActivityConfigByKey(req.headers.authorization);
    if (!config) return res.status(401).json({ success: false, error: "Unauthorized" });
    const done = await endMany(config.workspaceGroupId, sessions);
    return res.status(200).json({ success: true, ...done });
  } catch (error) {
    console.error("[activity] bulk-end:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export { handler };
export default withActivityApiRateLimit(withSessionRoute(handler));
