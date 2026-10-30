import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { createView, listViews } from "@/utils/views/saved";

// The saved views of the Staff table: the team's, and the signed-in person's own. The rules are in utils/views/saved.

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = Number(req.query.id);
  if (!groupId) return res.status(400).json({ success: false, error: "Missing workspace ID" });
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session?.userid) return res.status(401).json({ success: false, error: "Unauthorized" });
  const userId = BigInt(req.session.userid);

  try {
    if (req.method === "GET") {
      const found = await listViews(groupId, userId);
      if (!found) return res.status(401).json({ success: false, error: "Unauthorized" });
      return res.status(200).json({ success: true, ...found });
    }
    const made = await createView({ groupId, userId, body: req.body ?? {} });
    if (!made.ok) return res.status(made.status).json({ success: false, error: made.error });
    return res.status(201).json({ success: true, view: made.view });
  } catch (e) {
    console.error("Views API error:", e);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default withSessionRoute(handler);
