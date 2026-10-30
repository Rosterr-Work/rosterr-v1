import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { decideNotice, revokeNotice } from "@/utils/notices/service";

// Deal with a request: `{ id, status: "approve" | "deny" | "cancel", reviewComment? }`. Cancelling a notice needs manage_notices.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const { status, id, reviewComment } = req.body ?? {};
  if (!["approve", "deny", "cancel"].includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
  if (!id || typeof id !== "string") return res.status(400).json({ success: false, error: "Invalid id" });
  const groupId = parseInt(req.query.id as string, 10);
  const userId = req.session.userid as number;

  try {
    if (status === "cancel") {
      const access = await loadAccess(userId, groupId);
      if (!access || !allows(access, "manage_notices")) return res.status(403).json({ success: false, error: "Insufficient permissions. Canceling notices requires manage_notices permission." });
      const done = await revokeNotice({ groupId, actorId: userId, noticeId: id });
      if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    } else {
      const done = await decideNotice({ groupId, reviewerId: userId, noticeId: id, approve: status === "approve", comment: reviewComment });
      if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[notices] couldn't update:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}, ["approve_notices", "manage_notices"]);
