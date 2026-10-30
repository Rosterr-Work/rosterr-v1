import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { changeRole } from "@/utils/settings/members";

// Gives a person a different role (one of this workspace's). See utils/settings/members.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await changeRole({ groupId: parseInt(String(req.query.id), 10), actorId: Number(req.session.userid), userId: String(req.query.userid), roleId: req.body?.role });
  return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
}, "admin");
