import { withPermissionCheck } from "@/utils/permissionsManager";
import { toJson, replyIfFailed, withActor } from "@/utils/recommendations/http";
import { comment } from "@/utils/recommendations/service";

// POST { content?, image? }: add a comment (a picture is a data URL).
export default withPermissionCheck(
  withActor("POST", async ({ req, res, groupId, actor }) => {
    const done = await comment({ groupId, actor, id: String(req.query.recId ?? ""), content: req.body?.content, image: req.body?.image });
    if (replyIfFailed(res, done) || !done.ok) return;
    return res.status(200).json({ success: true, comment: toJson(done.comment) });
  }),
  "comment_recommendations"
);

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };
