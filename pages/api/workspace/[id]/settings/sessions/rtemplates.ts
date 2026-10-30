import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createTemplate, loadRolesPage } from "@/utils/sessions/templates";

// Session role templates: GET lists them (?archived=1 for the archived ones), POST makes one. See utils/sessions/templates.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (req.method === "GET") {
    const page = await loadRolesPage(groupId);
    return res.status(200).json({ success: true, templates: req.query.archived === "1" ? page.archivedTemplates : page.templates });
  }
  if (req.method === "POST") {
    const done = await createTemplate(groupId, req.body);
    return done.ok ? res.status(200).json({ success: true, template: done.template }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}, "manage_features");
