import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { deleteRole } from "@/utils/access/roleAdmin";

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.query.roleid) return res.status(400).json({ success: false, error: "Role ID not provided" });
  const done = await deleteRole({ groupId: parseInt(req.query.id as string), roleId: String(req.query.roleid), actorId: (req as any).session?.userid || null });
  if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
  return res.status(200).json({ success: true });
}
