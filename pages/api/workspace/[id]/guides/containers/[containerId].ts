import type { NextApiRequest, NextApiResponse } from "next";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { docRightsOf } from "@/utils/docs/rules";
import { removeFolder, updateFolder } from "@/utils/docs/service";
import { withPermissionCheck } from "@/utils/permissionsManager";

// Changing or removing a folder, or moving one document into or out of it.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const folderId = String(req.query.containerId);
  const access = await loadAccess(req.session.userid, groupId);
  if (!access) return res.status(403).json({ success: false, error: "Forbidden" });
  const ctx = { groupId: BigInt(groupId), by: BigInt(req.session.userid) };
  const rights = docRightsOf((p) => allows(access, p));
  if (req.method === "PUT") {
    const done = await updateFolder(ctx, rights, folderId, req.body);
    return done.ok ? res.status(200).json({ success: true, container: done.container }) : res.status(done.status).json({ success: false, error: done.error });
  }
  if (req.method === "DELETE") {
    const done = await removeFolder(ctx, rights, folderId);
    return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
