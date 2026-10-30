import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { listLogs } from "@/utils/sessions/detail";

// What has happened in a session. The log is written by the server as things happen; nobody can add to it from outside.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await listLogs(parseInt(String(req.query.id), 10), req.session.userid, String(req.query.sid));
  return done.ok ? res.status(200).json({ success: true, logs: done.logs }) : res.status(done.status).json({ success: false, error: done.error });
});
