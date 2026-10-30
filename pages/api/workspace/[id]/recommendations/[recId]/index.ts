import { withPermissionCheck } from "@/utils/permissionsManager";
import { toJson, replyIfFailed, withActor } from "@/utils/recommendations/http";
import { edit, getOne, remove } from "@/utils/recommendations/service";

// GET: one recommendation. PUT { reason, recommendedRankId?, recommendedRankName? }: change its words (manage). DELETE: remove it.
export default withPermissionCheck(
  withActor(["GET", "PUT", "DELETE"], async ({ req, res, groupId, actor }) => {
    const id = String(req.query.recId ?? "");
    if (req.method === "GET") {
      const rec = await getOne(groupId, id);
      return rec ? res.status(200).json({ success: true, recommendation: toJson(rec) }) : res.status(404).json({ success: false, error: "Not found" });
    }
    if (req.method === "PUT") {
      const hasRank = req.body?.recommendedRankId !== undefined;
      const done = await edit({ groupId, actor, id, reason: req.body?.reason, rank: hasRank ? { id: req.body.recommendedRankId, name: req.body.recommendedRankName } : undefined });
      if (replyIfFailed(res, done) || !done.ok) return;
      return res.status(200).json({ success: true, recommendation: toJson(done.recommendation) });
    }
    const done = await remove({ groupId, actor, id });
    if (replyIfFailed(res, done)) return;
    return res.status(200).json({ success: true });
  }),
  ["view_recommendations", "manage_recommendations"]
);
