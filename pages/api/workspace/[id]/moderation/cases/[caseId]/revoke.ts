import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { actorOf, groupOf, sendData, sendFail } from "@/utils/moderation/http";
import { revokeCase } from "@/utils/moderation/service";

// POST { reason }: take a case's punishment back. A ban made for it is lifted too.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const r = await revokeCase({ groupId: groupOf(req), actorId: actorOf(req), caseId: String(req.query.caseId ?? ""), reason: req.body?.reason });
    if (!r.ok) return sendFail(res, r);
    return sendData(res, r.case);
  } catch (error) {
    console.error("[moderation] revoke:", error);
    return res.status(500).json({ success: false, error: "Failed to revoke case action" });
  }
}, ["revoke_punishments"]);
