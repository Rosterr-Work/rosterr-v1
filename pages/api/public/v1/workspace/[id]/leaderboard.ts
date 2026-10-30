import { publicLeaderboard } from "@/utils/publicApi/activity";
import { publicRoute } from "@/utils/publicApi/route";

// GET .../leaderboard?userId=: the top three by time and by sessions this period, and where `userId` stands.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const you = typeof req.query.userId === "string" && /^\d{1,19}$/.test(req.query.userId) ? req.query.userId : undefined;
  return res.status(200).json(await publicLeaderboard(workspaceId, you));
});
