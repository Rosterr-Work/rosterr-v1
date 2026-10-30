import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { removeSessions } from "@/utils/sessions/remove";
import { scopeFrom } from "@/utils/sessions/scope";

// Deletes a session, or the part of its series the request names (`deleteScope`: single, future, future_type or all).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await removeSessions({ groupId: parseInt(String(req.query.id), 10), actorId: req.session.userid, sessionId: String(req.query.sid), scope: scopeFrom(req.body) });
  return done.ok ? res.status(200).json({ success: true, removed: done.removed }) : res.status(done.status).json({ success: false, error: done.error });
});
