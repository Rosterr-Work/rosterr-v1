import prisma from "@/utils/database";
import { logAudit } from "@/utils/logs";
import { createPost } from "@/utils/wall/create";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET .../wall: posts, newest first (limit up to 50, `before` is the id of the last one seen). POST .../wall: a post by the API key's owner.
const author = { select: { userid: true, username: true, picture: true } } as const;
const out = (p: { id: number; content: string; image: string | null; createdAt: Date; updatedAt: Date; author: { userid: bigint; username: string | null; picture: string | null } }) => ({
  id: p.id,
  content: p.content,
  image: p.image,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  author: { userId: Number(p.author.userid), username: p.author.username, thumbnail: p.author.picture },
});

export default publicRoute(["GET", "POST"], async ({ req, res, workspaceId, key }) => {
  if (req.method === "GET") {
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "20")) || 20));
    const before = Number.parseInt(String(req.query.before ?? ""));
    const posts = await prisma.wallPost.findMany({
      where: { workspaceGroupId: workspaceId, ...(Number.isInteger(before) && before > 0 ? { id: { lt: before } } : {}) },
      include: { author },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const shaped = posts.map(out);
    return res.status(200).json({ success: true, posts: shaped, total: shaped.length, nextCursor: shaped.length > 0 ? shaped[shaped.length - 1].id : null });
  }

  const { content, image } = req.body ?? {};
  if (!content) return fail(res, 400, "Content is required");
  const owner = BigInt(key.createdById);
  const member = await prisma.user.findFirst({ where: { userid: owner, OR: [{ roles: { some: { workspaceGroupId: workspaceId } } }, { workspaceMemberships: { some: { workspaceGroupId: workspaceId } } }] }, select: { userid: true } });
  if (!member) return fail(res, 403, "API key creator not a member of this workspace");

  // Pictures need the same right as on the website: the key's owner has to be allowed to add them.
  const { wallRights } = await import("@/utils/wall/rights");
  const rights = await wallRights(Number(owner), workspaceId);
  if (!rights.canPost) return fail(res, 403, "The owner of this API key is not allowed to post on the wall.");
  const made = await createPost({ groupId: workspaceId, authorId: owner, content, image, canPhoto: rights.canPhoto });
  if (!made.ok) return fail(res, made.status, made.error);
  const post = await prisma.wallPost.findUnique({ where: { id: made.id }, include: { author } });
  logAudit(workspaceId, Number(owner), "wall.post.create", `wallpost:${made.id}`, { id: made.id, authorId: Number(owner), via: "public_api" }).catch(() => {});
  return res.status(201).json({ success: true, post: out(post!) });
});
