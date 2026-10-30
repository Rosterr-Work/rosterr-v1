import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { loadActivitySession } from "@/utils/profile/activitySession";

// GET: one activity session, with the game's name and picture. The person's own, or with the right to view member profiles.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });
  if (!req.query.sid) return res.status(400).json({ success: false, error: "ID missing" });
  try {
    const r = await loadActivitySession(parseInt(req.query.id as string, 10), req.session.userid, String(req.query.sid));
    if (!r.ok) return res.status(r.status).json({ success: false, error: r.error });
    return res.status(200).json({ success: true, message: r.session, ...(r.universe ? { universe: r.universe } : {}) });
  } catch (error) {
    console.error("[activity] session:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
});
