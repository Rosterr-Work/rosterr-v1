import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { listSessions, rangeFromQuery } from "@/utils/sessions/list";

// Every session in a stretch of time, past ones included.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const range = rangeFromQuery(req.query) ?? { from: new Date(0), to: new Date("9999-12-31T23:59:59Z") };
  const sessions = await listSessions(parseInt(String(req.query.id), 10), req.session.userid, { ...range, past: true });
  return sessions ? res.status(200).json(sessions) : res.status(403).json({ error: "Forbidden" });
});
