import prisma from "@/utils/database";
import { readPaging } from "@/utils/publicApi/paging";
import { actingAs, commentOut } from "@/utils/publicApi/recommendations";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { comment } from "@/utils/recommendations/service";

// GET: the comments (limit up to 100, sortOrder asc|desc). POST { authorId, content, image? }: a comment by that person, who needs to be allowed
// to comment. The picture, if any, is a data URL and is checked like any other.
export default publicRoute(["GET", "POST"], async ({ req, res, workspaceId }) => {
  const id = String(req.query.recommendationId ?? "");
  const rec = await prisma.staffRecommendation.findFirst({ where: { id, workspaceGroupId: workspaceId }, select: { id: true } });
  if (!rec) return fail(res, 404, "Recommendation not found");

  if (req.method === "GET") {
    const paging = readPaging(req.query);
    if (!paging) return fail(res, 400, "limit and offset must be valid numbers");
    const [rows, total] = await Promise.all([
      prisma.staffRecommendationComment.findMany({ where: { recommendationId: id }, orderBy: { createdAt: req.query.sortOrder === "asc" ? "asc" : "desc" }, take: paging.limit, skip: paging.offset }),
      prisma.staffRecommendationComment.count({ where: { recommendationId: id } }),
    ]);
    return res.status(200).json({ success: true, comments: rows.map(commentOut), total, limit: paging.limit, offset: paging.offset });
  }

  const { authorId, content, image } = req.body ?? {};
  if (!authorId || !content) return fail(res, 400, "Missing required fields: authorId, content");
  if (typeof content !== "string" || !content.trim()) return fail(res, 400, "Content must be a non-empty string");
  if (content.length > 2000) return fail(res, 400, "Content must not exceed 2000 characters");
  const who = await actingAs(workspaceId, authorId);
  if (!who.ok) return fail(res, 400, who.error);
  const done = await comment({ groupId: workspaceId, actor: who.actor, id, content, image });
  if (!done.ok) return fail(res, done.status, done.error);
  return res.status(201).json({ success: true, comment: commentOut(done.comment) });
});
