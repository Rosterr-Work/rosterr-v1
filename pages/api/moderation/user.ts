import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { groupForModerationKey } from "@/utils/moderation/gameKey";
import { playerHistory } from "@/utils/moderation/feeds";

// For a game: a player's moderation history (?userid=, and ?current=true for only the bans in force now). The game sends its moderation key
// from Settings > Moderation in the Authorization header.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.headers.authorization) return res.status(400).json({ success: false, error: "Authorization key missing" });
  const userId = Number.parseInt(String(req.query.userid ?? req.query.userId));
  if (!userId || userId <= 0) return res.status(400).json({ success: false, error: "Invalid or missing userid" });
  try {
    const groupId = await groupForModerationKey(req.headers.authorization);
    if (!groupId) return res.status(401).json({ success: false, error: "Unauthorized" });
    const cases = await playerHistory(groupId, BigInt(userId), req.query.current === "true");
    return res.status(200).json({ success: true, data: { userId, total: cases.length, cases } });
  } catch (error) {
    console.error("[moderation] history:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
