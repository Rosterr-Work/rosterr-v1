import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";

// Whether time spent idle in game counts towards activity.

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") return res.status(400).json({ success: false, error: "Enabled must be true or false" });

  const before = await getConfig("activity", groupId);
  const after = { ...before, idleTimeEnabled: enabled };
  await setConfig("activity", after, groupId);
  await logAudit(groupId, (req as any).session?.userid || null, "settings.activity.idleTime.update", "activity.idleTime", { before, after }).catch(() => {});
  return res.status(200).json({ success: true });
}
