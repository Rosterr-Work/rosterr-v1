import { withPermissionCheck } from "@/utils/permissionsManager";
import { replyIfFailed, withActor } from "@/utils/recommendations/http";
import { vote } from "@/utils/recommendations/service";

// POST: vote for a recommendation, or take your vote back if you had given one.
export default withPermissionCheck(
  withActor("POST", async ({ req, res, groupId, actor }) => {
    const done = await vote({ groupId, actor, id: String(req.query.recId ?? "") });
    if (replyIfFailed(res, done) || !done.ok) return;
    return res.status(200).json({ success: true, voted: done.voted, voteCount: done.voteCount });
  }),
  "vote_recommendations"
);

