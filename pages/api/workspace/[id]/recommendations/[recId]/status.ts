import { withPermissionCheck } from "@/utils/permissionsManager";
import { toJson, replyIfFailed, withActor } from "@/utils/recommendations/http";
import { setStatus } from "@/utils/recommendations/service";

// PUT { status }: move a recommendation between Active, Approved, Rejected and Archived.
export default withPermissionCheck(
  withActor("PUT", async ({ req, res, groupId, actor }) => {
    const done = await setStatus({ groupId, actor, id: String(req.query.recId ?? ""), status: req.body?.status });
    if (replyIfFailed(res, done) || !done.ok) return;
    return res.status(200).json({ success: true, recommendation: toJson(done.recommendation) });
  }),
  "manage_recommendations"
);
