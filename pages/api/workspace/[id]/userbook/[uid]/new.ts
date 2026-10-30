import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createEntry } from "@/utils/logbook/create";

// Writes an entry in a person's logbook, and (for those allowed to rank) moves their rank. See utils/logbook/create.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const uid = String(req.query.uid ?? "");
  if (!/^\d{1,19}$/.test(uid)) return res.status(400).json({ success: false, error: "Missing required fields" });
  const done = await createEntry({ groupId: parseInt(String(req.query.id), 10), actorId: req.session.userid, targetId: uid, body: req.body });
  if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
  return res.status(200).json({ success: true, log: done.log, ...(done.terminated ? { terminated: true } : {}) });
});
