import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { plain } from "@/utils/profile/load";

// POST { redacted?: boolean }: hides a logbook entry's words from people without the right to see them (or shows them again). Only an
// entry about the person in the address, in this workspace.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const { id, uid, entryId } = req.query;
  if (!id || !uid || !entryId || !/^\d{1,19}$/.test(String(uid))) return res.status(400).json({ success: false, error: "Missing required fields" });
  const groupId = BigInt(String(id));
  const actor = BigInt(req.session.userid as number);
  try {
    const entry = await prisma.logbookEntry.findFirst({ where: { id: String(entryId), workspaceGroupId: groupId, userId: BigInt(String(uid)) }, select: { id: true } });
    if (!entry) return res.status(404).json({ success: false, error: "Entry not found" });
    const hide = req.body?.redacted === undefined ? true : Boolean(req.body.redacted);
    const updated = await prisma.logbookEntry.update({
      where: { id: entry.id },
      data: { redacted: hide, redactedBy: hide ? actor : null, redactedAt: hide ? new Date() : null },
      include: { admin: { select: { userid: true, username: true, picture: true } } },
    });
    const by = updated.redactedBy ? await prisma.user.findUnique({ where: { userid: updated.redactedBy }, select: { userid: true, username: true } }) : null;
    await logAudit(Number(groupId), Number(actor), hide ? "userbook.redact" : "userbook.unredact", `userbook:${updated.id}`, { entryId: updated.id, redacted: updated.redacted }).catch(() => {});
    return res.status(200).json({ success: true, entry: { ...plain(updated), ...(by ? { redactedByUser: { userid: by.userid.toString(), username: by.username || null } } : {}) } });
  } catch (error) {
    console.error("[logbook] redact:", error);
    return res.status(500).json({ success: false, error: "Failed to redact entry" });
  }
}, "logbook_redact");
