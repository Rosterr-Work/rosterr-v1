import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getGroupRoles } from "@/utils/roblox";

// The workspace's Roblox group ranks, lowest first, without the guest rank. For the pickers that choose a rank.

export default withPermissionCheck(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = Number(req.query.id);
  try {
    const roles = await getGroupRoles(groupId);
    const ranks = roles
      .filter((r) => r.rank !== 0)
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({ id: r.id, name: r.name, rank: r.rank, groupId }));
    return res.status(200).json({ success: true, ranks });
  } catch (error) {
    console.error("Error fetching ranks:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch ranks" });
  }
}
