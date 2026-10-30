import prisma from "@/utils/database";
import { actingAs, recommendationOut } from "@/utils/publicApi/recommendations";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { edit, getOne, remove, setStatus } from "@/utils/recommendations/service";

// GET: one recommendation with its votes and comments.
// PATCH { status?, statusChangedById?, reason?, editedById? }: move it or change its words, as the person named (who needs to manage recommendations).
// DELETE { deletedById }: remove it, as that person (who needs to be allowed to delete them).
export default publicRoute(["GET", "PATCH", "DELETE"], async ({ req, res, workspaceId }) => {
  const id = String(req.query.recommendationId ?? "");

  if (req.method === "GET") {
    const rec = await prisma.staffRecommendation.findFirst({
      where: { id, workspaceGroupId: workspaceId },
      include: { votes: { select: { id: true, userId: true, createdAt: true } }, comments: { orderBy: { createdAt: "desc" } } },
    });
    if (!rec) return fail(res, 404, "Recommendation not found");
    return res.status(200).json({ success: true, recommendation: recommendationOut(rec as any, { votes: "withIds", comments: true }) });
  }

  const b = req.body ?? {};
  if (req.method === "DELETE") {
    if (!b.deletedById) return fail(res, 400, "deletedById is required to delete recommendation");
    const who = await actingAs(workspaceId, b.deletedById);
    if (!who.ok) return fail(res, 400, who.error);
    const done = await remove({ groupId: workspaceId, actor: who.actor, id });
    if (!done.ok) return fail(res, done.status === 404 ? 404 : done.status, done.status === 404 ? "Recommendation not found" : done.error);
    return res.status(200).json({ success: true, message: "Recommendation deleted successfully" });
  }

  // PATCH
  if (b.status === undefined && b.reason === undefined) return fail(res, 400, "No valid fields to update");
  if (b.status !== undefined) {
    if (!b.statusChangedById) return fail(res, 400, "statusChangedById is required when changing status");
    const who = await actingAs(workspaceId, b.statusChangedById);
    if (!who.ok) return fail(res, 400, who.error);
    const done = await setStatus({ groupId: workspaceId, actor: who.actor, id, status: b.status });
    if (!done.ok) return fail(res, done.status, done.status === 404 ? "Recommendation not found" : done.status === 400 ? "Invalid status. Must be one of: active, approved, rejected, archived" : done.error);
  }
  if (b.reason !== undefined) {
    if (!b.editedById) return fail(res, 400, "editedById is required when changing reason");
    const who = await actingAs(workspaceId, b.editedById);
    if (!who.ok) return fail(res, 400, who.error);
    const done = await edit({ groupId: workspaceId, actor: who.actor, id, reason: b.reason });
    if (!done.ok) return fail(res, done.status, done.status === 404 ? "Recommendation not found" : done.error);
  }
  const rec = await getOne(workspaceId, id);
  return res.status(200).json({ success: true, recommendation: recommendationOut(rec as any) });
});
