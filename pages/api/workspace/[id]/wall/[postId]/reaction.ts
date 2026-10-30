import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { ERROR_TEXT, toggleReaction } from "@/utils/wall/actions";

// Reacts to a Wall post with an emoji, or takes the same reaction back. Each emoji is its own reaction.

type Answer = { success: boolean; error?: string; reaction?: { emoji: string; reacted: boolean; count: number } };

export default withPermissionCheck(handler, "react_wall");

export async function handler(req: NextApiRequest, res: NextApiResponse<Answer>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const groupId = Number(req.query.id);
  const postId = Number(req.query.postId);
  const userId = req.session.userid;
  if (!Number.isFinite(groupId) || !Number.isFinite(postId) || !userId) return res.status(400).json({ success: false, error: "Invalid request" });

  const emoji = typeof req.body?.emoji === "string" ? req.body.emoji.trim() : "";
  if (!emoji || emoji.length > 16) return res.status(400).json({ success: false, error: "Invalid emoji" });

  const done = await toggleReaction(groupId, Number(userId), postId, emoji);
  if (!done.ok) return res.status(ERROR_TEXT[done.error].status).json({ success: false, error: ERROR_TEXT[done.error].message });

  logAudit(groupId, Number(userId), "wall.post.react", `wallpost:${postId}`, { postId, emoji, action: done.reacted ? "added" : "removed" }).catch(() => {});
  return res.status(200).json({ success: true, reaction: { emoji, reacted: done.reacted, count: done.count } });
}
