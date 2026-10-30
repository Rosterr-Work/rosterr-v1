import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadGames, readPlaceIds, saveGames } from "@/utils/settings/home";

// The Roblox places listed in the home page's Games box (up to ten): GET reads them, PATCH ({ placeIds }) sets them.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (!groupId) return res.status(400).json({ success: false, error: "Invalid workspace id" });
  if (req.method === "GET") return res.status(200).json({ success: true, placeIds: await loadGames(groupId) });
  if (req.method === "PATCH") {
    await saveGames(groupId, readPlaceIds(req.body));
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
}, "workspace_customisation");
