import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { readAdjustment } from "@/utils/activity/adjustment";

// Awards or removes minutes of activity for a member of this workspace. The minutes join their total for the period.

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const actorId = req.session.userid;
  if (!actorId) return res.status(401).json({ success: false, error: "Unauthorized" });
  const groupId = parseInt(req.query.id as string);

  const read = readAdjustment(req.body);
  if (!read.ok) return res.status(400).json({ success: false, error: read.error });
  const { userId, minutes, reason } = read.adjustment;

  const member = await prisma.membership.findUnique({ where: { workspaceGroupId_userId: { workspaceGroupId: BigInt(groupId), userId: BigInt(userId) } }, select: { userId: true } });
  if (!member) return res.status(404).json({ success: false, error: "That person isn't a member of this workspace" });

  const adjustment = await prisma.activityCorrection.create({
    data: { userId: BigInt(userId), actorId: BigInt(actorId), workspaceGroupId: groupId, minutes, reason },
    include: { actor: { select: { username: true } } },
  });
  await logAudit(groupId, Number(actorId), "activity.adjustment", `user:${userId}`, { minutes, reason, actorId, userId }).catch(() => {});

  const safe = JSON.parse(JSON.stringify(adjustment, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
  return res.status(200).json({ success: true, adjustment: safe });
}

export default withPermissionCheck(handler, "activity_adjustments");
