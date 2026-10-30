import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { deleteView, updateView } from "@/utils/views/saved";

// One saved view: PATCH its filters and columns, or DELETE it. The rules (whose view, which right) are in utils/views/saved.

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = Number(req.query.id);
  const viewId = String(req.query.viewId ?? "");
  if (!groupId) return res.status(400).json({ success: false, error: "Missing workspace ID" });
  if (!viewId) return res.status(400).json({ success: false, error: "Missing view ID" });
  if (req.method !== "DELETE" && req.method !== "PATCH") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session?.userid) return res.status(401).json({ success: false, error: "Unauthorized" });
  const userId = BigInt(req.session.userid);

  try {
    if (req.method === "DELETE") {
      const done = await deleteView({ groupId, userId, viewId });
      return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
    }
    const done = await updateView({ groupId, userId, viewId, body: req.body });
    return done.ok ? res.status(200).json({ success: true, view: done.view }) : res.status(done.status).json({ success: false, error: done.error });
  } catch (e) {
    console.error("View API error:", e);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default withSessionRoute(handler);
