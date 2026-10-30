import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { logAudit } from "@/utils/logs";

// Removing an entry from someone's logbook. Only the workspace's owner may; the entry must be on that person's page and in this
// workspace.

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  const { id, uid, entryId } = req.query;
  if (typeof id !== "string" || typeof uid !== "string" || typeof entryId !== "string") return res.status(400).json({ success: false, error: "Missing required fields" });
  const groupId = parseInt(id);

  try {
    const workspace = await prisma.workspace.findUnique({ where: { groupId }, select: { ownerId: true } });
    if (!workspace) return res.status(404).json({ success: false, error: "Workspace not found." });
    if (!workspace.ownerId || workspace.ownerId !== BigInt(userId)) return res.status(403).json({ success: false, error: "Only workspace owners may delete entries." });

    const entry = await prisma.logbookEntry.findFirst({ where: { id: entryId, workspaceGroupId: BigInt(groupId), userId: /^\d+$/.test(uid) ? BigInt(uid) : -1n } });
    if (!entry) return res.status(404).json({ success: false, error: "Entry not found." });

    await prisma.logbookEntry.delete({ where: { id: entryId } });
    await logAudit(groupId, userId, "userbook.delete", `userbook:${entryId}`, { entryId }).catch(() => {});
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete logbook entry:", error);
    return res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
}
