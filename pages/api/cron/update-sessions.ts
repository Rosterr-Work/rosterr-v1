import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { cronGuard } from "@/utils/cron/guard";
import { expireCover } from "@/utils/sessions/cover";

// Every few minutes: sessions whose time has come are marked started, and sessions that have run their length are marked ended. Only
// sessions starting within the next half hour (or already running) are looked at. Requests for cover on sessions that have started close.

const LOOKAHEAD_MS = 30 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!cronGuard(req, res)) return;

  try {
    const now = new Date();
    const open = await prisma.workspaceSession.findMany({ where: { ended: null, date: { lte: new Date(now.getTime() + LOOKAHEAD_MS) } }, select: { id: true, date: true, duration: true, startedAt: true } });

    let updatedStarted = 0;
    let updatedEnded = 0;
    for (const s of open) {
      const endsAt = new Date(s.date.getTime() + s.duration * 60_000);
      if (endsAt <= now) {
        await prisma.workspaceSession.update({ where: { id: s.id }, data: { ended: endsAt } });
        updatedEnded++;
      } else if (!s.startedAt && s.date <= now) {
        await prisma.workspaceSession.update({ where: { id: s.id }, data: { startedAt: s.date } });
        updatedStarted++;
      }
    }
    const coverClosed = await expireCover(now).catch((e) => {
      console.error("Cron update-sessions: closing cover requests failed", e);
      return 0;
    });
    return res.status(200).json({ success: true, updatedStarted, updatedEnded, coverClosed });
  } catch (e: any) {
    console.error("Cron update-sessions error:", e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
