import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";

// Totals across the workspace for the current activity period: messages sent and (when idle time counts) minutes idle.

export default withPermissionCheck(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });

  const groupId = parseInt(req.query.id as string);
  const idleTimeEnabled = ((await getConfig("activity", groupId))?.idleTimeEnabled ?? true) as boolean;

  const totals = await prisma.playSession.aggregate({
    where: { workspaceGroupId: groupId, active: false, archived: { not: true } },
    _sum: { messages: true, idleTime: true },
  });

  return res.status(200).json({
    success: true,
    message: {
      messages: Number(totals._sum.messages ?? 0),
      idle: idleTimeEnabled ? Number(totals._sum.idleTime ?? 0) : 0,
      idleTimeEnabled,
    },
  });
}
