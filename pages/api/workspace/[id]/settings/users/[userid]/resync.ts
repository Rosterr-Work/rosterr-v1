import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { resyncMember } from "@/utils/settings/members";

// Sets a person's role from their current Roblox rank.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await resyncMember({ groupId: parseInt(String(req.query.id), 10), actorId: Number(req.session.userid), userId: String(req.query.userid) });
  return done.ok ? res.status(200).json({ success: true, newRole: done.newRole }) : res.status(done.status).json({ success: false, error: done.error });
}, "admin");
