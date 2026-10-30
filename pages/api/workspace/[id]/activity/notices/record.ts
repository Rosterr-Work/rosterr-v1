import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { recordNotice } from "@/utils/notices/service";
import { userIdOf } from "@/utils/publicApi/sessions";

// A manager records leave for someone else, approved at once: `{ userId, startTime, endTime, reason }`.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const target = userIdOf(req.body?.userId);
  if (!target) return res.status(400).json({ success: false, error: "Missing required fields: userId, startTime, endTime, reason" });
  try {
    const made = await recordNotice({ groupId: parseInt(req.query.id as string, 10), actorId: req.session.userid, targetId: target, body: req.body });
    if (!made.ok) return res.status(made.status).json({ success: false, error: made.error });
    const n = made.notice;
    return res.status(201).json({ success: true, message: "Notice created successfully", notice: { id: n.id, startTime: n.startTime, endTime: n.endTime, reason: n.reason, approved: n.approved, reviewed: n.reviewed } });
  } catch (error) {
    console.error("[notices] couldn't record:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}, "record_notices");
