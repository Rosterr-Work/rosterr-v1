import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { addNote, listNotes } from "@/utils/sessions/detail";

// A session's notes: read them, or add one.
const recent = new Map<string, number[]>();
function tooFast(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > 15;
}

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const sessionId = String(req.query.sid);
  if (req.method === "GET") {
    const done = await listNotes(groupId, req.session.userid, sessionId);
    return done.ok ? res.status(200).json({ success: true, notes: done.notes }) : res.status(done.status).json({ success: false, error: done.error });
  }
  if (req.method === "POST") {
    if (tooFast(`${groupId}:${sessionId}:${req.session.userid}`)) return res.status(429).json({ success: false, error: "Too many notes created. Please wait a moment before adding more notes." });
    const done = await addNote(groupId, req.session.userid, sessionId, req.body?.content);
    return done.ok ? res.status(200).json({ success: true, note: done.note }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
