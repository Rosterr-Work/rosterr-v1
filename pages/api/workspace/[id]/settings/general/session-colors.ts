import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadAccess } from "@/utils/access/store";
import { allows } from "@/utils/access/engine";
import { loadColours, saveColours } from "@/utils/sessions/appearance";

// The colour for each kind of session. Anyone in the workspace reads it (every sessions screen needs it); changing it needs
// workspace customisation. See utils/sessions/appearance.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (req.method === "GET") return res.status(200).json({ success: true, colors: await loadColours(groupId) });
  if (req.method === "PATCH") {
    const access = await loadAccess(req.session.userid as number, groupId);
    if (!access || !allows(access, "workspace_customisation")) return res.status(403).json({ success: false, error: "Workspace customisation access required." });
    const done = await saveColours(groupId, Number(req.session.userid), req.body);
    return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
