import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

// Deleting a note on a session: its author may, and so may a workspace admin. A note is only found through its own workspace.

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  const { id, sid, noteId } = req.query;
  if (typeof id !== "string" || typeof sid !== "string" || typeof noteId !== "string") return res.status(400).json({ success: false, error: "Missing required fields" });
  const groupId = parseInt(id);

  try {
    const note = await prisma.sessionComment.findFirst({ where: { id: noteId, sessionId: sid, session: { sessionType: { workspaceGroupId: groupId } } } });
    if (!note) return res.status(404).json({ success: false, error: "Note not found" });

    if (note.authorId !== BigInt(userId)) {
      const member = await prisma.membership.findUnique({ where: { workspaceGroupId_userId: { workspaceGroupId: BigInt(groupId), userId: BigInt(userId) } }, select: { isAdmin: true } });
      if (!member?.isAdmin) return res.status(403).json({ success: false, error: "You can only delete your own notes" });
    }

    await prisma.sessionComment.delete({ where: { id: noteId } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return res.status(500).json({ success: false, error: "Failed to delete note" });
  }
}
