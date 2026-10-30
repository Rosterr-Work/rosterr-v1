import prisma from "@/utils/database";
import { commentOut } from "@/utils/publicApi/recommendations";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET: one comment.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const id = String(req.query.recommendationId ?? "");
  const rec = await prisma.staffRecommendation.findFirst({ where: { id, workspaceGroupId: workspaceId }, select: { id: true } });
  if (!rec) return fail(res, 404, "Recommendation not found");
  const c = await prisma.staffRecommendationComment.findFirst({ where: { id: String(req.query.commentId ?? ""), recommendationId: id } });
  if (!c) return fail(res, 404, "Comment not found");
  return res.status(200).json({ success: true, comment: commentOut(c) });
});
