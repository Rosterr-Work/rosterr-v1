import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { createPost } from "@/utils/wall/create";
import { loadPosts } from "@/utils/wall/feed";
import { wallRights } from "@/utils/wall/rights";

// A new Wall post: `{ content?, image? }` (image as a data URL, which needs the add-photos right). The post comes back in the feed's shape,
// with `reactions` empty and `image` null so the phone apps, which decode the older shape, still read it.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string, 10);
  const userId = req.session.userid as number;

  try {
    const rights = await wallRights(userId, groupId);
    const made = await createPost({ groupId, authorId: userId, content: req.body?.content, image: req.body?.image, canPhoto: rights.canPhoto });
    if (!made.ok) return res.status(made.status).json({ success: false, error: made.error });
    logAudit(groupId, userId, "wall.post.create", "wall", { id: made.id, hasImage: Boolean(req.body?.image) }).catch(() => {});
    const [post] = await loadPosts(groupId, userId, [made.id]);
    return res.status(200).json({ success: true, post: { ...post, image: null, pinnedAt: null, reactions: [] } });
  } catch (error) {
    console.error("[wall] couldn't post:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}, "post_on_wall");

// A picture comes in as a data URL, so the body can be large.
export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };
