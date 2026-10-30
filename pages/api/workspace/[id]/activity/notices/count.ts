import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

// How many inactivity notices are waiting to be reviewed (the number on the menu).

export default withPermissionCheck(handler, "approve_notices");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string; count?: number }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const count = await prisma.leaveNotice.count({ where: { workspaceGroupId: parseInt(req.query.id as string), reviewed: false } });
    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Pending notices count error:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
