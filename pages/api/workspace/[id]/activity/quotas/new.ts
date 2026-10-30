import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createQuota } from "@/utils/quotas/service";
import { toJson } from "@/utils/recommendations/http";

// POST { name, type, value?, roles, departments, description?, sessionType?, completionType? }: a new quota.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const done = await createQuota({ groupId: parseInt(req.query.id as string, 10), actorId: req.session.userid ?? null, body: req.body });
    if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    return res.status(200).json({ success: true, quota: toJson(done.quota) });
  } catch (error) {
    console.error("[quotas] create:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}, "create_quotas");
