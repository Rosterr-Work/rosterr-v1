import type { NextApiRequest, NextApiResponse } from "next";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { loadCase } from "@/utils/moderation/case-load";
import { actorOf, groupOf, guarded, sendData, sendFail } from "@/utils/moderation/http";
import { deleteCase, updateCase } from "@/utils/moderation/service";

// GET: one case with its people and evidence. PUT: edit it (its author, or anyone allowed to edit cases). DELETE: remove it.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = groupOf(req);
  const caseId = String(req.query.caseId ?? "");
  try {
    if (req.method === "GET") {
      const c = await loadCase(groupId, caseId);
      return c ? sendData(res, c) : res.status(404).json({ success: false, error: "Case not found" });
    }
    if (req.method === "PUT") {
      const access = await loadAccess(actorOf(req), Number(groupId));
      const r = await updateCase({ groupId, actorId: actorOf(req), caseId, body: req.body, mayEditAny: Boolean(access && allows(access, "edit_moderation_cases")), mayExecute: Boolean(access && (allows(access, "execute_punishments") || allows(access, "execute_bans"))) });
      if (!r.ok) return sendFail(res, r);
      return sendData(res, r.case);
    }
    const r = await deleteCase({ groupId, actorId: actorOf(req), caseId });
    if (!r.ok) return sendFail(res, r);
    return res.status(200).json({ success: true, message: "Case deleted successfully" });
  } catch (error) {
    console.error("[moderation] case:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}

export default guarded(handler, { GET: ["view_moderation"], PUT: ["view_moderation"], DELETE: ["delete_moderation_cases"] });
