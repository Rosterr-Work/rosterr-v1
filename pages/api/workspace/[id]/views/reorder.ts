import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { reorderViews } from "@/utils/views/saved";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = Number(req.query.id);
  if (!groupId) return res.status(400).json({ success: false, error: "Missing workspace ID" });
  if (!req.session?.userid) return res.status(401).json({ success: false, error: "Unauthorized" });

  try {
    const done = await reorderViews({ groupId, userId: BigInt(req.session.userid), ids: req.body?.viewIds });
    if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error reordering views:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default withSessionRoute(handler);
