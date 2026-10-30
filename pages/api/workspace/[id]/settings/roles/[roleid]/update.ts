import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { updateRole } from "@/utils/access/roleAdmin";

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await updateRole({
    groupId: parseInt(req.query.id as string),
    roleId: String(req.query.roleid),
    actorId: (req as any).session?.userid || null,
    body: req.body,
  });
  if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
  return res.status(200).json({ success: true });
}
