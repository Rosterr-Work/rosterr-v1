import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createCategory, loadRolesPage } from "@/utils/sessions/templates";

// Categories that group session role templates: GET lists them (?archived=1 for archived), POST makes one.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (req.method === "GET") {
    const page = await loadRolesPage(groupId);
    return res.status(200).json({ success: true, categories: req.query.archived === "1" ? page.archivedCategories : page.categories });
  }
  if (req.method === "POST") {
    const done = await createCategory(groupId, req.body);
    return done.ok ? res.status(200).json({ success: true, category: done.category }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}, "manage_features");
