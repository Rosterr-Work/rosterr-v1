import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { loadConcurrent } from "@/utils/profile/activitySession";

// GET ?sessionId=: who else was in the game during an activity session. The session's person, or with the right to view member profiles.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ message: "Not logged in" });
  const sessionId = String(req.query.sessionId ?? "");
  if (!sessionId) return res.status(400).json({ message: "Missing required parameters" });
  try {
    const r = await loadConcurrent(parseInt(req.query.id as string, 10), req.session.userid, sessionId);
    if (!r.ok) return res.status(r.status).json({ message: r.error });
    return res.status(200).json({ users: r.users, totalConcurrent: r.totalConcurrent });
  } catch (error) {
    console.error("[activity] concurrent:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
