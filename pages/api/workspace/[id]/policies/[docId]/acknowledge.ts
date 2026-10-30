import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { inAudience, loadViewer } from "@/utils/documents/audience";
import { logAudit } from "@/utils/logs";
import { sameName, sameWord } from "@/utils/policies/ack";
import { plain } from "@/utils/profile/load";

// A member agrees to a policy that is for them. The phone apps send one tap and the web sends what was typed; where the web typed a
// word or a username, it has to match.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
  const groupId = parseInt(String(req.query.id), 10);
  const docId = String(req.query.docId);
  const { signature, typedWord, typedName } = req.body ?? {};

  const document = await prisma.staffDocument.findFirst({
    where: { id: docId, workspaceGroupId: groupId, requiresAcknowledgment: true },
    select: { id: true, name: true, requiresAcknowledgment: true, assignToEveryone: true, acknowledgmentMethod: true, acknowledgmentWord: true, roles: { select: { id: true } }, departments: { select: { id: true } } },
  });
  if (!document) return res.status(404).json({ success: false, error: "Document not found" });

  // Members only, and the same idea of "for them" as everywhere else, including policies set to everyone.
  const viewer = await loadViewer(groupId, BigInt(userId));
  if (!viewer.isMember || !inAudience(document, viewer.roleIds, viewer.departmentIds)) return res.status(403).json({ success: false, error: "Access denied" });

  if (document.acknowledgmentMethod === "type_word" && typedWord !== undefined && !sameWord(typedWord, document.acknowledgmentWord)) return res.status(400).json({ success: false, error: "That isn't the word." });
  if (document.acknowledgmentMethod === "type_username" && typedName !== undefined) {
    const me = await prisma.user.findUnique({ where: { userid: BigInt(userId) }, select: { username: true } });
    if (!sameName(typedName, me?.username)) return res.status(400).json({ success: false, error: "That isn't your username." });
  }

  if (await prisma.policySignoff.findFirst({ where: { userId: BigInt(userId), documentId: docId }, select: { id: true } })) return res.status(400).json({ success: false, error: "Policy already acknowledged" });

  const acknowledgment = await prisma.policySignoff.create({
    data: {
      userId: BigInt(userId),
      documentId: docId,
      signature: typeof signature === "string" && signature ? signature.slice(0, 5000) : `Acknowledged by user at ${new Date().toISOString()}`,
      ipAddress: String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim().slice(0, 100),
      isRequired: document.requiresAcknowledgment,
    },
  });
  await logAudit(groupId, Number(userId), "policy.acknowledge", `policy:${document.id}`, { documentId: document.id, documentName: document.name, signature: signature ? "provided" : "default" }).catch(() => {});
  return res.status(200).json({ success: true, acknowledgment: plain(acknowledgment) });
});
