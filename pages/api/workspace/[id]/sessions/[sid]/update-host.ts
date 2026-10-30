import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { setHost } from "@/utils/sessions/host";

// Sets a session's host (`ownerId`), or removes it (null). The phone apps use this.
const recent = new Map<string, number[]>();
function tooFast(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > 20;
}

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id), 10);
  if (tooFast(`${groupId}:${req.session.userid}`)) return res.status(429).json({ success: false, error: "Too many role assignment attempts. Please wait a moment before making more changes." });
  const raw = req.body?.ownerId;
  if (raw !== null && raw !== undefined && !/^\d{1,19}$/.test(String(raw))) return res.status(400).json({ success: false, error: "That isn't a user." });
  const done = await setHost({ groupId, actorId: req.session.userid, sessionId: String(req.query.sid), ownerId: raw ?? null });
  return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
});
