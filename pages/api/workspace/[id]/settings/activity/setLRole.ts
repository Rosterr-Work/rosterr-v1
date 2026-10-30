import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";

// Which Roblox rank the leaderboard is limited to (or none). Stored with the rest of the workspace's activity settings.

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);

  const role = req.body?.role;
  if (role !== null && role !== undefined && (typeof role !== "number" || !Number.isFinite(role))) {
    return res.status(400).json({ success: false, error: "Leaderboard role must be a number" });
  }

  const before = ((await getConfig("activity", groupId)) || {}) as Record<string, unknown>;
  const { lRole: _old, ...rest } = before; // an older name for the same setting
  const after = { ...rest, leaderboardRole: role ?? null };
  await setConfig("activity", after, groupId);

  await logAudit(groupId, (req as any).session?.userid || null, "settings.activity.lRole.update", "activity.lRole", { before, after } as any).catch(() => {});
  return res.status(200).json({ success: true });
}
