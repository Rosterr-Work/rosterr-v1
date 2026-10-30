import type { NextApiRequest, NextApiResponse } from "next";
import prisma, { type StaffRole } from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

// Every role of the workspace, for the permissions editor.

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string; roles?: StaffRole[] }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const roles = await prisma.staffRole.findMany({ where: { workspaceGroupId: parseInt(req.query.id as string) } });
  return res.status(200).json({ success: true, roles });
}
