import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadWorkspaceSummary } from "@/utils/workspace/summary";

// GET: the workspace as the signed-in person sees it (name, colour, plan, what is switched on, and their own rights).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not authenticated" });
  const groupId = parseInt(String(req.query.id), 10);
  if (!groupId) return res.status(400).json({ success: false, error: "Missing required fields" });
  const r = await loadWorkspaceSummary(groupId, req.session.userid);
  if (r.status !== 200) return res.status(r.status).json({ success: false, error: r.error });
  return res.status(200).json({ success: true, permissions: r.permissions, workspace: r.workspace });
});
