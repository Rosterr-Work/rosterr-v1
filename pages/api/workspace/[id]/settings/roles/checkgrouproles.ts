import type { NextApiRequest, NextApiResponse } from "next";
import { checkGroupRoles, withPermissionCheck } from "@/utils/permissionsManager";

// Starts a check of everyone's Roblox ranks against the workspace's roles. It runs on in the background; the answer is just "started".

export default withPermissionCheck(handler, "admin");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);
  if (isNaN(groupId)) return res.status(400).json({ success: false, error: "Invalid workspace ID" });
  checkGroupRoles(groupId).catch((error) => console.error("Error checking group roles:", error));
  return res.status(200).json({ success: true });
}
