import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { saveAnnouncement } from "@/utils/home/announcement";

// POST { title, subtitle?, sections: [{ title, content }] }: change the sticky announcement.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const r = await saveAnnouncement(parseInt(req.query.id as string, 10), req.session.userid, req.body);
    if (!r.ok) return res.status(r.status).json({ success: false, error: r.error });
    return res.status(200).json({ success: true, announcement: r.announcement });
  } catch (error) {
    console.error("[announcement] save:", error);
    return res.status(500).json({ success: false, error: "Failed to update announcement" });
  }
}, "edit_sticky_post");
