import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";

// Deletes a quota. It is looked up inside this workspace, so a right here never reaches another workspace's quota.

export default withPermissionCheck(handler, "delete_quotas");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });
  const quotaId = req.query.qid;
  if (typeof quotaId !== "string" || !quotaId) return res.status(400).json({ success: false, error: "Missing or invalid quota id" });
  const groupId = parseInt(req.query.id as string);

  try {
    const quota = await prisma.activityQuota.findFirst({ where: { id: quotaId, workspaceGroupId: groupId }, select: { id: true, name: true, type: true, value: true } });
    if (!quota) return res.status(404).json({ success: false, error: "Quota not found" });

    // All three together or none: a failure part-way would leave a quota with its roles stripped.
    await prisma.$transaction([
      prisma.quotaTargetRole.deleteMany({ where: { quotaId } }),
      prisma.quotaTargetDepartment.deleteMany({ where: { quotaId } }),
      prisma.activityQuota.delete({ where: { id: quotaId } }),
    ]);

    await logAudit(groupId, (req as any).session?.userid || null, "activity.activityQuota.delete", `quota:${quota.name}`, { id: quotaId, name: quota.name, type: quota.type, value: quota.value }).catch(() => {});
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting quota:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
