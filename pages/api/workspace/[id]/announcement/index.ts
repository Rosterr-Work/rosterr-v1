import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { loadAnnouncement } from "@/utils/home/announcement";

// GET: the sticky announcement, and whether the signed-in person may edit it.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string, 10);
  if (!req.session.userid || !groupId) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const r = await loadAnnouncement(groupId, req.session.userid);
    if (!r) return res.status(401).json({ success: false, error: "Unauthorized" });
    return res.status(200).json({ success: true, announcement: r.announcement, canEdit: r.canEdit });
  } catch (error) {
    console.error("[announcement] load:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch announcement" });
  }
});
