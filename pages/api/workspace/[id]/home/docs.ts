import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadHomeDocs } from "@/utils/home/data";

// The Documents box: the latest documents this person may open.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const docs = await loadHomeDocs(parseInt(String(req.query.id), 10), req.session.userid as number);
  if (!docs) return res.status(403).json({ success: false, error: "You do not have permission to view this workspace." });
  return res.status(200).json({ success: true, docs });
});
