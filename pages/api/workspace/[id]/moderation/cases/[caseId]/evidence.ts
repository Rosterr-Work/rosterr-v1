import type { NextApiRequest, NextApiResponse } from "next";
import { actorOf, groupOf, guarded, sendData, sendFail } from "@/utils/moderation/http";
import { addEvidence, listEvidence } from "@/utils/moderation/evidenceService";

// GET: the case's evidence. POST: add a file (base64) or a link. Reading needs to see moderation; adding needs a right to add (seeing alone
// used to be enough). Anyone who can open or edit a case can add to it.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const caseId = String(req.query.caseId ?? "");
  try {
    if (req.method === "GET") {
      const r = await listEvidence(groupOf(req), caseId);
      return r.ok ? sendData(res, r.evidence) : sendFail(res, r);
    }
    const r = await addEvidence({ groupId: groupOf(req), actorId: actorOf(req), caseId, body: req.body });
    return r.ok ? sendData(res, r.evidence, 201) : sendFail(res, r);
  } catch (error) {
    console.error("[moderation] evidence:", error);
    return res.status(500).json({ success: false, error: req.method === "GET" ? "Failed to fetch evidence" : error instanceof Error ? error.message : "Failed to upload evidence" });
  }
}

export default guarded(handler, { GET: ["view_moderation"], POST: ["upload_evidence", "create_moderation_cases", "edit_moderation_cases"] });

// A file comes in as base64, so the body can be large.
export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };
