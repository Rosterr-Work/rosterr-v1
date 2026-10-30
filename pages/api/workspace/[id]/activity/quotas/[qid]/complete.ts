import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { completeOwn } from "@/utils/quotas/service";
import { idOf } from "@/utils/moderation/caseRules";
import { toJson } from "@/utils/recommendations/http";

// POST { notes? }: a person ticks off their own custom quota (only for quotas set to be completed by the person).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const me = BigInt(req.session.userid);
  // Only their own: a different targetUserId is refused rather than quietly ignored.
  if (req.body?.targetUserId && idOf(req.body.targetUserId) !== me) return res.status(403).json({ success: false, error: "You can only complete your own quotas" });
  try {
    const done = await completeOwn({ groupId: parseInt(req.query.id as string, 10), userId: me, quotaId: String(req.query.qid ?? ""), notes: req.body?.notes });
    if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    return res.status(200).json({ success: true, completion: toJson(done.completion) });
  } catch (error) {
    console.error("[quotas] complete:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
});
