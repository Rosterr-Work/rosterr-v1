import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getRankGun, getRankingProvider } from "@/utils/rankgun";

// Whether the workspace can change people's Roblox ranks from here, and through which service (RankGun or Roblox directly).

export default withPermissionCheck(handler, "rank_users");

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);
  if (!groupId) return res.status(400).json({ success: false, error: "Missing workspace ID" });

  try {
    const [provider, rankGun] = await Promise.all([getRankingProvider(groupId), getRankGun(groupId)]);
    return res.status(200).json({ success: true, rankGunEnabled: Boolean(rankGun || provider), rankingEnabled: Boolean(provider), rankingProvider: provider?.type ?? null });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to check ranking configuration" });
  }
}
