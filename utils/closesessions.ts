import prisma from "@/utils/database";

// Activity sessions are opened and closed by the Roblox game's heartbeat. If the server stops while someone is in game, nothing closes
// theirs, and it would keep counting (once a person showed 6000+ minutes). So on start-up every open one is closed at that moment; the
// game opens a fresh one on its next heartbeat.

export async function closeActiveSessions(): Promise<number> {
  try {
    const closed = await prisma.playSession.updateMany({ where: { active: true }, data: { endTime: new Date(), active: false } });
    if (closed.count) console.log(`[STARTUP] Closed ${closed.count} activity session(s) left open by the last run.`);
    return closed.count;
  } catch (error) {
    console.error("[STARTUP] Error closing active sessions:", error);
    return 0;
  }
}
