import fs from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import { fileTypeFromBuffer } from "file-type";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { getEvidenceFilePath, isSafeSegment } from "@/utils/evidenceManager";

// An evidence file, to people who may see moderation in the workspace the case belongs to.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ error: "Unauthorized" });
  const { caseId, fileName } = req.query;
  if (!isSafeSegment(caseId) || !isSafeSegment(fileName)) return res.status(404).json({ error: "Evidence not found" });

  try {
    const evidence = await prisma.moderationAttachment.findFirst({ where: { caseId, fileUrl: `/api/evidence/${caseId}/${fileName}` }, select: { fileType: true, case: { select: { workspaceGroupId: true } } } });
    if (!evidence) return res.status(404).json({ error: "Evidence not found" });
    const access = await loadAccess(req.session.userid, Number(evidence.case.workspaceGroupId));
    if (!access) return res.status(403).json({ error: "Access denied" });
    if (!allows(access, "view_moderation")) return res.status(403).json({ error: "Insufficient permissions" });

    const file = getEvidenceFilePath(caseId, fileName);
    if (!file) return res.status(404).json({ error: "File not found on disk" });
    const bytes = fs.readFileSync(file);
    const type = await fileTypeFromBuffer(bytes);
    res.setHeader("Content-Type", type?.mime || evidence.fileType || "application/octet-stream");
    res.setHeader("Content-Length", bytes.length);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(bytes);
  } catch (error) {
    console.error("Error serving evidence file:", error);
    return res.status(500).json({ error: "Failed to serve file" });
  }
});

export const config = { api: { responseLimit: "30mb" } };
