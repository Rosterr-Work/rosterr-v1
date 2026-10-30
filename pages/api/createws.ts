import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { getRankInGroup, MIN_OWNER_RANK } from "@/utils/roblox";
import { hasEarlyAccess, waitlistMode } from "@/utils/waitlist";
import { limitReachedMessage } from "@/utils/workspaceLimit";
import { workspaceAllowance } from "@/utils/workspace/allowance";
import { COOKIE as REFERRAL_COOKIE, recordReferral } from "@/utils/referrals";
import { createWorkspace, finishWorkspaceSetup } from "@/utils/workspace/create";

// Makes a workspace for a Roblox group the signed-in person leads (rank 25 or above). Optionally with the group's Open Cloud key.

type Answer = { success: boolean; error?: string; workspaceGroupId?: number };

export default withSessionRoute(handler);

/** A group id sent as a number or a string of digits; null when it is neither. */
export function readGroupId(raw: unknown): number | null {
  const n = typeof raw === "string" && /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function handler(req: NextApiRequest, res: NextApiResponse<Answer>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });
  if (!(await prisma.user.findUnique({ where: { userid: userId }, select: { userid: true } }))) return res.status(401).json({ success: false, error: "Not logged in" });

  // While Rosterr is "coming soon", creating a workspace needs early access (being on one already doesn't).
  if (waitlistMode() && !req.session.platformAccess && !(await hasEarlyAccess(userId))) {
    return res.status(403).json({ success: false, error: "Creating a workspace needs early access. Apply on the waitlist page." });
  }

  const raw = req.body?.groupId;
  if (raw === undefined || raw === null) return res.status(400).json({ success: false, error: "Missing groupId" });
  const groupId = readGroupId(raw);
  if (groupId === null) return res.status(400).json({ success: false, error: "Invalid groupId" });
  const robloxApiKey = typeof req.body?.robloxApiKey === "string" && req.body.robloxApiKey.trim() ? req.body.robloxApiKey.trim() : undefined;

  // Everyone, Rosterr staff included, may own up to their limit (utils/workspaceLimit.ts).
  const allowance = await workspaceAllowance(userId);
  if (!allowance.canOwnMore) return res.status(403).json({ success: false, error: limitReachedMessage(allowance.limit) });

  const rank = await getRankInGroup(groupId, userId);
  if (!rank || rank < MIN_OWNER_RANK) return res.status(400).json({ success: false, error: "You are not a high enough rank" });

  const created = await createWorkspace({ groupId, ownerUserId: BigInt(userId), robloxApiKey });
  if (!created.ok) return res.status(created.reason === "exists" ? 409 : 500).json({ success: false, error: created.error });

  await finishWorkspaceSetup(groupId, BigInt(userId), rank, created.workspace.groupName, created.workspace.groupLogo);
  // Came through another workspace's referral link? Recorded once, and the link is forgotten either way.
  if (req.cookies?.[REFERRAL_COOKIE]) {
    await recordReferral(req.cookies[REFERRAL_COOKIE], groupId, BigInt(userId));
    res.setHeader("Set-Cookie", `${REFERRAL_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
  }
  return res.status(200).json({ success: true, workspaceGroupId: Number(created.workspace.groupId) });
}
