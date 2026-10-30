import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadGames } from "@/utils/home/games";

// GET: the games shown on Home, with who is playing now. Any member of the workspace.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    return res.status(200).json({ success: true, games: await loadGames(parseInt(req.query.id as string, 10)) });
  } catch (error) {
    console.error("[home] games:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});
