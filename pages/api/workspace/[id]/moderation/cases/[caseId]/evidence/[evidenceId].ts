import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { removeEvidence } from "@/utils/moderation/evidenceService";
import { actorOf, groupOf, sendFail } from "@/utils/moderation/http";

// DELETE: remove one piece of evidence. Its uploader and the case's author always may; anyone else needs to be allowed to edit cases or delete evidence.
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Unauthorized" });
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const groupId = groupOf(req);
    const access = await loadAccess(actorOf(req), Number(groupId));
    if (!access) return res.status(403).json({ success: false, error: "Access denied" });
    const r = await removeEvidence({ groupId, actorId: actorOf(req), caseId: String(req.query.caseId ?? ""), evidenceId: String(req.query.evidenceId ?? ""), mayDeleteAny: allows(access, ["edit_moderation_cases", "delete_evidence"]) });
    return r.ok ? res.status(200).json({ success: true, message: "Evidence deleted successfully" }) : sendFail(res, r);
  } catch (error) {
    console.error("[moderation] delete evidence:", error);
    return res.status(500).json({ success: false, error: "Failed to delete evidence" });
  }
});
