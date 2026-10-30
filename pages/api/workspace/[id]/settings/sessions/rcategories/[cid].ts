import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { removeCategory, updateCategory } from "@/utils/sessions/templates";

// One category: PATCH renames, reorders, archives or restores it; DELETE removes it, or archives it if its roles were used.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const id = String(req.query.cid ?? "");
  if (req.method === "PATCH") {
    const done = await updateCategory(groupId, id, req.body);
    return done.ok ? res.status(200).json({ success: true, category: done.category }) : res.status(done.status).json({ success: false, error: done.error });
  }
  if (req.method === "DELETE") {
    const done = await removeCategory(groupId, id);
    return done.ok ? res.status(200).json({ success: true, archived: done.archived, category: done.category }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}, "manage_features");
