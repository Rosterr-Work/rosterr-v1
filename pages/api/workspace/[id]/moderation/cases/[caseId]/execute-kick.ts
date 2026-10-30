import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { actorOf, groupOf, sendData, sendFail } from "@/utils/moderation/http";
import { executeKick } from "@/utils/moderation/service";

// POST: mark a kick case as carried out (the game picks it up through the live feed).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const r = await executeKick({ groupId: groupOf(req), actorId: actorOf(req), caseId: String(req.query.caseId ?? "") });
    if (!r.ok) return sendFail(res, r);
    return sendData(res, r.case);
  } catch (error) {
    console.error("[moderation] kick:", error);
    return res.status(500).json({ success: false, error: "Failed to execute kick" });
  }
}, ["execute_punishments"]);
