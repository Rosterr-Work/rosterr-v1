import { liveFeed } from "@/utils/moderation/feeds";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET .../moderation/live?since=&placeId=: kicks and bans carried out since `since` that a game should act on.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const { since, placeId } = req.query;
  if (!since || typeof since !== "string") return fail(res, 400, "Missing required query parameter: since");
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) return fail(res, 400, "Invalid since date - must be an ISO 8601 timestamp");
  const data = await liveFeed(BigInt(workspaceId), sinceDate, typeof placeId === "string" && /^\d{1,19}$/.test(placeId) ? placeId : null);
  return res.status(200).json({ success: true, data });
});
