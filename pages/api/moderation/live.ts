import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { groupForModerationKey } from "@/utils/moderation/gameKey";
import { liveFeed } from "@/utils/moderation/feeds";

// For a game: kicks and bans carried out since `since` (ISO time) that it should act on, optionally for one `placeId`.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.headers.authorization) return res.status(400).json({ success: false, error: "Authorization key missing" });
  const { since, placeId } = req.query;
  if (!since || typeof since !== "string") return res.status(400).json({ success: false, error: "Missing required query parameter: since" });
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) return res.status(400).json({ success: false, error: "Invalid since date - must be an ISO 8601 timestamp" });
  try {
    const groupId = await groupForModerationKey(req.headers.authorization);
    if (!groupId) return res.status(401).json({ success: false, error: "Unauthorized" });
    const data = await liveFeed(groupId, sinceDate, typeof placeId === "string" && /^\d{1,19}$/.test(placeId) ? placeId : null);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[moderation] live:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
