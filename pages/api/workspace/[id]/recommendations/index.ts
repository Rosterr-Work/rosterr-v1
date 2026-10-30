import { withPermissionCheck } from "@/utils/permissionsManager";
import { getThumbnail } from "@/utils/userinfoEngine";
import { toJson, replyIfFailed, withActor } from "@/utils/recommendations/http";
import { readStatus } from "@/utils/recommendations/rules";
import { create, list } from "@/utils/recommendations/service";
import { userIdOf } from "@/utils/publicApi/sessions";

// GET ?status=active|approved|rejected|archived: the list. POST { targetUserId, targetUsername, reason, recommendedRankId?, recommendedRankName? }: a new one.
export default withPermissionCheck(
  withActor(["GET", "POST"], async ({ req, res, groupId, actor }) => {
    if (req.method === "GET") {
      const status = req.query.status === undefined ? "active" : readStatus(req.query.status);
      if (!status) return res.status(400).json({ success: false, error: "Invalid status filter" });
      return res.status(200).json({ success: true, recommendations: toJson(await list(groupId, status)) });
    }
    const body = req.body ?? {};
    const target = userIdOf(body.targetUserId);
    if (!target || !body.targetUsername || !body.reason) return res.status(400).json({ success: false, error: "Missing required fields" });
    let picture: string | null = null;
    try {
      picture = await getThumbnail(Number(target));
    } catch {}
    const done = await create({ groupId, actor, input: { targetUserId: target, targetUsername: String(body.targetUsername), targetPicture: picture, reason: body.reason, recommendedRankId: body.recommendedRankId, recommendedRankName: body.recommendedRankName } });
    if (replyIfFailed(res, done) || !done.ok) return;
    return res.status(200).json({ success: true, recommendation: toJson(done.recommendation) });
  }),
  ["view_recommendations", "post_recommendations"]
);
