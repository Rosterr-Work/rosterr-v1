import type { NextApiRequest, NextApiResponse } from "next";
import { cronGuard } from "@/utils/cron/guard";
import { syncWorkspaces, workspacesToSync } from "@/utils/cron/rolesync";
import { checkGroupRoles } from "@/utils/permissionsManager";

// Run about every hour: brings each workspace's roles in line with Roblox. With `?id=` (or `{ workspaceId }`) it starts just that one in
// the background and answers at once.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!cronGuard(req, res)) return;
  try {
    const asked = (req.query.id as string | undefined) || (req.body && (req.body.workspaceId || req.body.id));
    if (asked) {
      const id = parseInt(String(asked), 10);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: "Invalid workspace ID" });
      checkGroupRoles(BigInt(id)).catch((e) => console.error("checkgrouproles cron error:", e));
      return res.status(200).json({ success: true, started: 1, workspaces: [id] });
    }
    const { groups, batchId } = await workspacesToSync();
    const ids = await syncWorkspaces(groups);
    return res.status(200).json({ success: true, started: ids.length, workspaces: ids, batchId });
  } catch (e: any) {
    console.error("Cron checkgrouproles error:", e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
