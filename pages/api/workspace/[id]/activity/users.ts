import type { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { isPeriod } from "@/utils/activity/data";
import { loadLeaderboard } from "@/utils/activity/leaderboard";

// The leaderboard is remembered for 30 seconds per period.
const cache = new NodeCache({ stdTTL: 30, checkperiod: 60 });

type Data = { success: boolean; error?: string; message?: object };

export default withPermissionCheck(handler);

// The leaderboard, from the shared activity rule, for any period (?period=current|last|all).
export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });

  const workspaceId = parseInt(req.query.id as string);
  const period = isPeriod(req.query.period) ? req.query.period : "current";
  const key = `${workspaceId}:${period}`;
  const hit = cache.get<any>(key);
  if (hit) return res.status(200).json({ success: true, message: hit });
  const board = await loadLeaderboard(workspaceId, period);
  cache.set(key, board);
  return res.status(200).json({ success: true, message: board });
}
