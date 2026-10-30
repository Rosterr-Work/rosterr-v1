import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { isValidTimezone } from "@/utils/timezoneUtils";

// The first time someone opens the app their browser's time zone is saved on their membership, so times can be shown to others in
// their own zone. It never overwrites one the person has already chosen.

export default withSessionRoute(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const timezone = req.body?.timezone;
  if (typeof timezone !== "string" || !isValidTimezone(timezone)) return res.status(400).json({ error: "Invalid timezone" });

  try {
    const key = { workspaceGroupId: BigInt(parseInt(req.query.id as string)), userId: BigInt(userId) };
    // The account's time zone, set the same way: only when the person hasn't chosen one, and then it is theirs in every workspace.
    await prisma.user.updateMany({ where: { userid: key.userId, OR: [{ timezone: null }, { timezone: "" }] }, data: { timezone } });
    // One statement, so two tabs opening at once can't both "set it first".
    const saved = await prisma.membership.updateMany({ where: { ...key, OR: [{ timezone: null }, { timezone: "" }] }, data: { timezone } });
    if (saved.count) return res.status(200).json({ success: true, updated: true });
    const member = await prisma.membership.findUnique({ where: { workspaceGroupId_userId: key }, select: { userId: true } });
    return res.status(200).json(member ? { success: true, updated: false } : { success: true, updated: false, reason: "Member not found" });
  } catch (error) {
    console.error("Error updating timezone:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
