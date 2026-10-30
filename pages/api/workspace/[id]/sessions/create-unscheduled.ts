import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createFromType } from "@/utils/sessions/create";

// A one-off session from a session type that allows them (the phone apps use this). The website makes sessions through POST .../sessions/create.
const recent = new Map<string, number[]>();
function tooFast(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 40_000);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > 5;
}

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id), 10);
  if (tooFast(`${groupId}:${req.session.userid}`)) return res.status(429).json({ success: false, error: "Too many session creation requests." });
  const made = await createFromType({ groupId, actorId: req.session.userid, body: req.body });
  return made.ok ? res.status(200).json({ success: true, session: made.session }) : res.status(made.status).json({ success: false, error: made.error });
});
