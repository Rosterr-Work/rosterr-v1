import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { testKey } from "@/utils/settings/external";

// Tries a Roblox Open Cloud key against this workspace's group and says what is wrong with it. Workspace admins only.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ valid: false, message: "Method not allowed" });
  const { status, ...result } = await testKey(parseInt(String(req.query.id), 10), req.body?.apiKey);
  return res.status(status).json(result);
}, "admin");
