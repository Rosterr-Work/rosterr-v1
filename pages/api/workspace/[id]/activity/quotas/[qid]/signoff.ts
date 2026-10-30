import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { signOff } from "@/utils/quotas/service";
import { idOf } from "@/utils/moderation/caseRules";
import { toJson } from "@/utils/recommendations/http";

// POST { targetUserId, notes?, periodEnd? }: a manager ticks off a custom quota for someone (periodEnd: in a saved period).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const target = idOf(req.body?.targetUserId);
  if (!target) return res.status(400).json({ success: false, error: "Target user ID is required" });
  try {
    const done = await signOff({ groupId: parseInt(req.query.id as string, 10), actorId: BigInt(req.session.userid), quotaId: String(req.query.qid ?? ""), targetUserId: target, notes: req.body?.notes, periodEnd: req.body?.periodEnd });
    if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    return res.status(200).json({ success: true, completion: toJson(done.completion) });
  } catch (error) {
    console.error("[quotas] signoff:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}, "signoff_custom_quotas");
