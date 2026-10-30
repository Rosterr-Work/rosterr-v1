import prisma from "@/utils/database";
import { actingAs } from "@/utils/publicApi/recommendations";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { vote } from "@/utils/recommendations/service";

// GET: who voted. POST { userId }: that person votes (they need to be allowed to vote). DELETE { userId }: takes that person's vote back.
export default publicRoute(["GET", "POST", "DELETE"], async ({ req, res, workspaceId }) => {
  const id = String(req.query.recommendationId ?? "");
  const rec = await prisma.staffRecommendation.findFirst({ where: { id, workspaceGroupId: workspaceId }, select: { id: true } });
  if (!rec) return fail(res, 404, "Recommendation not found");

  if (req.method === "GET") {
    const votes = await prisma.staffRecommendationVote.findMany({ where: { recommendationId: id }, orderBy: { createdAt: "desc" } });
    return res.status(200).json({ success: true, votes: votes.map((v) => ({ id: v.id, userId: Number(v.userId), createdAt: v.createdAt })), total: votes.length });
  }

  const userId = req.body?.userId;
  if (!userId) return fail(res, 400, "Missing required field: userId");
  const who = await actingAs(workspaceId, userId);
  if (!who.ok) return fail(res, 400, who.error);
  const done = await vote({ groupId: workspaceId, actor: who.actor, id, mode: req.method === "POST" ? "add" : "remove" });
  if (!done.ok) return fail(res, done.status, done.error);
  if (req.method === "DELETE") return res.status(200).json({ success: true, message: "Vote removed successfully", voteCount: done.voteCount });
  const row = await prisma.staffRecommendationVote.findUnique({ where: { recommendationId_userId: { recommendationId: id, userId: who.actor.id } } });
  return res.status(201).json({ success: true, vote: { id: row?.id, recommendationId: id, userId: Number(who.actor.id), createdAt: row?.createdAt }, voteCount: done.voteCount });
});
