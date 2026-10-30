import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

// The most recent reset of the activity period: when, and who did it. Null if it has never been reset.

export default withPermissionCheck(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; lastReset?: unknown; error?: string }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const last = await prisma.activityPeriodReset.findFirst({
      where: { workspaceGroupId: Number(req.query.id) },
      orderBy: { resetAt: "desc" },
      include: { resetBy: { select: { username: true, picture: true } } },
    });
    // Ids are BigInt, which JSON can't carry.
    const lastReset = last ? JSON.parse(JSON.stringify(last, (_k, v) => (typeof v === "bigint" ? v.toString() : v))) : null;
    return res.status(200).json({ success: true, lastReset });
  } catch (error) {
    console.error("Error reading the last reset:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
