import type { NextApiRequest, NextApiResponse } from "next";
import type { StaffRole } from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { startingPermissions } from "@/utils/access/roles";
import { createRole } from "@/utils/access/roleAdmin";

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string; role?: StaffRole }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  // A new role can start from a preset: a list of permissions to tick, nothing locked to it.
  const preset = req.body?.preset;
  const start = startingPermissions(preset);
  if (!start.ok) return res.status(400).json({ success: false, error: start.error });
  const role = await createRole({ groupId: parseInt(req.query.id as string), actorId: (req as any).session?.userid || null, name: start.name, permissions: start.permissions, color: start.color, preset });
  return res.status(200).json({ success: true, role });
}
