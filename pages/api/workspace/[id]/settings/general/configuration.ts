import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { isStaffrConnected } from "@/utils/staffr/connection";
import { hiringOn } from "@/utils/hiring/gate";

// Which optional features the workspace has switched on, for the menu to show or hide. A member of the workspace may read it.
// The moderation setting also holds the key the Roblox module signs in with, so only whether it is on goes out.
// "Applications" is on when Staffr is connected (the older route in). "Hiring" and "Careers" are Rosterr 2's own hiring, on once the staged release
// reaches the workspace (utils/hiring/gate.ts).

export default withPermissionCheck(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });
  const groupId = parseInt(req.query.id as string);

  const now = new Date();
  const [allies, recommendations, policies, moderation, staffr, openJobs, hiring] = await Promise.all([
    getConfig("allies", groupId),
    getConfig("recommendations", groupId),
    getConfig("policies", groupId),
    getConfig("moderation", groupId),
    isStaffrConnected(groupId),
    prisma.jobListing.count({ where: { workspaceGroupId: BigInt(groupId), status: "OPEN", hiddenAt: null, OR: [{ closesAt: null }, { closesAt: { gt: now } }] } }),
    hiringOn(groupId),
  ]);

  return res.status(200).json({
    success: true,
    value: { allies, recommendations, policies, moderation: { enabled: Boolean(moderation?.enabled) }, applications: { enabled: staffr }, hiring: { enabled: hiring }, careers: { enabled: hiring && openJobs > 0 } },
  });
}
