import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { claimSlot, unclaimSlot } from "@/utils/sessionClaim";
import { rateWindow } from "@/utils/rateWindow";

// Taking a role in a session (or giving someone it), and leaving it. The rules are in utils/sessionClaim.

const limit = rateWindow({ windowMs: 2000, max: 10 });

export default withPermissionCheck(handler);

async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  const actorId = (req as any).session?.userid;
  if (!limit.allow(`${req.query.id}:${actorId ?? "anonymous"}`)) return res.status(429).json({ success: false, error: "Too many role assignment requests. Slow down." });
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const { sid } = req.query;
  const { userId, roleId, slot, action } = req.body ?? {};
  if (!sid || !roleId || slot === undefined || !action) return res.status(400).json({ success: false, error: "Missing required parameters" });
  if (action !== "claim" && action !== "unclaim") return res.status(400).json({ success: false, error: 'Invalid action. Must be "claim" or "unclaim"' });
  if (action === "claim" && !userId) return res.status(400).json({ success: false, error: "userId is required for claim action" });

  try {
    const groupId = parseInt(req.query.id as string);
    const outcome =
      action === "claim"
        ? await claimSlot({ groupId, sessionId: sid as string, actorId, targetUserId: userId, roleId, slot })
        : await unclaimSlot({ groupId, sessionId: sid as string, actorId, roleId, slot });
    if (!outcome.ok) return res.status(outcome.status).json({ success: false, error: outcome.error });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error managing role claim:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
