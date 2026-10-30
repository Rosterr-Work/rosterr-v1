import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { uncomplete } from "@/utils/quotas/service";
import { idOf } from "@/utils/moderation/caseRules";

// POST or DELETE { targetUserId }: take a tick back (an admin, a manager with signoff rights, or the person for a quota they complete themselves).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const target = idOf(req.body?.targetUserId);
  if (!target) return res.status(400).json({ success: false, error: "Target user ID is required" });
  try {
    const done = await uncomplete({ groupId: parseInt(req.query.id as string, 10), actorId: BigInt(req.session.userid), quotaId: String(req.query.qid ?? ""), targetUserId: target });
    if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[quotas] uncomplete:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
});
