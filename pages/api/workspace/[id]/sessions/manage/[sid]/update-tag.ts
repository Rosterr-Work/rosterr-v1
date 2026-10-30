import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { setTag } from "@/utils/sessions/detail";

// Gives a session a tag, or takes it off (`sessionTagId: null`). The session is named in the body; `sid` in the path is not used.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  const sessionId = req.body?.sessionId;
  if (!sessionId || typeof sessionId !== "string") return res.status(400).json({ error: "Missing session ID" });
  const done = await setTag(parseInt(String(req.query.id), 10), req.session.userid, sessionId, req.method === "DELETE" ? null : req.body?.sessionTagId || null);
  return done.ok ? res.status(200).json({ success: true, tag: done.tag }) : res.status(done.status).json({ error: done.error });
});
