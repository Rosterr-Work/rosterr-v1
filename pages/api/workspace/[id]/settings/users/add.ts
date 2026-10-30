import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { addMember } from "@/utils/settings/members";

// Adds a person to the workspace by Roblox username, in a chosen role. See utils/settings/members.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await addMember({ groupId: parseInt(String(req.query.id), 10), actorId: Number(req.session.userid), username: req.body?.username, roleId: req.body?.role ?? req.body?.roleId });
  return done.ok ? res.status(200).json({ success: true, user: done.user }) : res.status(done.status).json({ success: false, error: done.error });
}, "admin");
