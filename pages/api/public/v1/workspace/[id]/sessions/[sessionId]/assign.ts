import { fail, publicRoute } from "@/utils/publicApi/route";
import { assign } from "@/utils/publicApi/sessions";

// POST or PATCH .../sessions/{id}/assign with { action: "assign" | "unassign", userId, roleId, slot }. Without those it just returns the session.
export default publicRoute(["POST", "PATCH"], async ({ req, res, workspaceId, key }) => {
  const sessionId = String(req.query.sessionId ?? "");
  if (!sessionId) return fail(res, 400, "Missing session ID");
  const done = await assign({ workspaceId, actorId: BigInt(key.createdById), sessionId, body: req.body });
  if (!done.ok) return fail(res, done.status, done.error);
  return res.status(200).json({ success: true, message: "Session updated successfully", session: done.session });
});
