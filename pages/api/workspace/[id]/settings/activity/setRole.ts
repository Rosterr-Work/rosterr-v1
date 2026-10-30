import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getGroupRole } from "@/utils/roblox";
import { logAudit } from "@/utils/logs";

// Which Roblox rank counts as "staff" for activity: the people at this rank and above are tracked.

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);
  const rank = req.body?.role;
  if (typeof rank !== "number") return res.status(400).json({ success: false, error: "Role must be a rank number" });

  const role = await getGroupRole(groupId, rank);
  if (!role) return res.status(404).json({ success: false, error: "Role not found" });

  const before = await getConfig("activity", groupId);
  const after = { ...before, role: role.rank };
  await setConfig("activity", after, groupId);
  await logAudit(groupId, (req as any).session?.userid || null, "settings.activity.staffRole.update", "activity.role", { before, after }).catch(() => {});
  return res.status(200).json({ success: true });
}
