import { playerHistory } from "@/utils/moderation/feeds";
import { idOf } from "@/utils/moderation/caseRules";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET .../moderation/user/{userId}?current=true: a player's cases here; `current` keeps only the bans in force now.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const userId = idOf(String(req.query.userId ?? ""));
  if (!userId) return fail(res, 400, "Missing or invalid user ID");
  const cases = await playerHistory(BigInt(workspaceId), userId, req.query.current === "true");
  return res.status(200).json({ success: true, data: { userId: Number(userId), total: cases.length, cases } });
});
