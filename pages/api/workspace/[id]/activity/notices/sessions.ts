import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

// Before someone files an inactivity notice: the sessions they are down to host or attend within those dates, which the notice would
// clash with. Only the person's own, and only ones that haven't started.

type Clash = { id: string; name: string | null; date: string; sessionTypeName: string };

export default withPermissionCheck(handler, "create_notices");

const DAY_MS = 24 * 60 * 60 * 1000;

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string; sessions?: Clash[] }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  const { startTime, endTime } = req.body ?? {};
  if (typeof startTime !== "number" || typeof endTime !== "number" || !startTime || !endTime) {
    return res.status(400).json({ success: false, error: "Invalid startTime or endTime" });
  }

  try {
    const me = BigInt(userId);
    const sessions = await prisma.workspaceSession.findMany({
      where: {
        startedAt: null,
        date: { gte: new Date(startTime), lte: new Date(endTime + DAY_MS - 1) }, // the end date counts for the whole day
        sessionType: { workspaceGroupId: parseInt(req.query.id as string) },
        OR: [{ ownerId: me }, { users: { some: { userid: me } } }],
      },
      select: { id: true, name: true, date: true, sessionType: { select: { name: true } } },
      orderBy: { date: "asc" },
    });
    return res.status(200).json({ success: true, sessions: sessions.map((s) => ({ id: s.id, name: s.name, date: s.date.toISOString(), sessionTypeName: s.sessionType.name })) });
  } catch {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
