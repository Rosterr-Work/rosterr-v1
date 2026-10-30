import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { removeMember } from "@/utils/settings/members";

// Takes a person out of the workspace: their roles, departments and rank here. Admins and the owner can't be removed this way.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await removeMember({ groupId: parseInt(String(req.query.id), 10), actorId: Number(req.session.userid), userId: String(req.query.userid) });
  return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
}, "admin");
