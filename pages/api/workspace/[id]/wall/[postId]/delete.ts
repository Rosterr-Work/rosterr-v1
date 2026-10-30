import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { logAudit } from "@/utils/logs";
import { deletePost, ERROR_TEXT } from "@/utils/wall/actions";

// Taking down a Wall post: its author may, and so may anyone with the right to delete any post in this workspace.

export default withPermissionCheck(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });

  const userId = req.session.userid;
  const groupId = parseInt(req.query.id as string);
  const postId = parseInt(req.query.postId as string);
  if (!userId || isNaN(groupId) || isNaN(postId)) return res.status(400).json({ success: false, error: "Invalid request" });

  const access = await loadAccess(userId, groupId);
  const done = await deletePost(groupId, Number(userId), postId, Boolean(access && allows(access, "delete_wall_posts")));
  if (!done.ok) return res.status(ERROR_TEXT[done.error].status).json({ success: false, error: ERROR_TEXT[done.error].message });

  await logAudit(groupId, Number(userId), "wall.post.delete", `wallpost:${postId}`, { id: postId }).catch(() => {});
  return res.status(200).json({ success: true });
}
