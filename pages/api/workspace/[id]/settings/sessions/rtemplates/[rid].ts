import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { removeTemplate, updateTemplate } from "@/utils/sessions/templates";

// One template: PATCH changes it (or archives or restores it), DELETE removes it, or archives it if sessions used it.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const id = String(req.query.rid ?? "");
  if (req.method === "PATCH") {
    const done = await updateTemplate(groupId, id, req.body);
    return done.ok ? res.status(200).json({ success: true, template: done.template }) : res.status(done.status).json({ success: false, error: done.error });
  }
  if (req.method === "DELETE") {
    const done = await removeTemplate(groupId, id);
    return done.ok ? res.status(200).json({ success: true, archived: done.archived, template: done.template }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}, "manage_features");
