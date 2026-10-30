import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getGroupRoles } from "@/utils/roblox";

// The activity settings with the group's ranks to choose from. Any member may read it (the ranks are public on Roblox).

export default withPermissionCheck(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);

  const [roles, config] = await Promise.all([getGroupRoles(groupId), getConfig("activity", groupId)]);
  return res.status(200).json({
    success: true,
    roles,
    currentRole: config?.role,
    leaderboardRole: config?.leaderboardRole ?? config?.lRole, // lRole is the older name
    idleTimeEnabled: config?.idleTimeEnabled ?? true,
    staffPanelEnabled: config?.staffPanelEnabled !== false,
  });
}
