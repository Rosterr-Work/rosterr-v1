import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { withActivityApiRateLimit } from "@/utils/prtl";
import { findActivityConfigByKey } from "@/utils/activityAuth";
import { handleEvent, readEvent } from "@/utils/activity/ingest";

// The in-game activity package: POST ?type=create|end with { userid, placeid?, idleTime?, messages? } and the workspace's activity key in the
// Authorization header. Answers 200 with a note when the person's rank is below the configured minimum.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.headers.authorization) return res.status(400).json({ success: false, error: "Authorization key missing" });
  const type = req.query.type;
  if (!type || typeof type !== "string") return res.status(400).json({ success: false, error: "Missing query type (create or end)" });
  if (type !== "create" && type !== "end") return res.status(400).json({ success: false, error: "Invalid query type" });
  const read = readEvent(req.body, type);
  if (!read.ok) return res.status(400).json({ success: false, error: "Invalid or missing userid" });

  try {
    const config = await findActivityConfigByKey(req.headers.authorization);
    if (!config) return res.status(401).json({ success: false, error: "Unauthorized" });
    const minRank = (config.value as any)?.role ?? null;
    const outcome = await handleEvent(config.workspaceGroupId, { ...read.value, type }, minRank);
    if (outcome === "skipped") return res.status(200).json({ success: true, error: "User is not the right rank" });
    if (outcome === "exists") return res.status(400).json({ success: false, error: "Session already initialized" });
    if (outcome === "none") return res.status(400).json({ success: false, error: "Session not found" });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[activity] session:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export { handler };
export default withActivityApiRateLimit(withSessionRoute(handler));
