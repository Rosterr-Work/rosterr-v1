import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { saveHome } from "@/utils/settings/home";

// Saves which boxes the home page shows and where. See utils/settings/home.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    await saveHome(parseInt(String(req.query.id), 10), Number(req.session.userid) || null, req.body);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to save home settings:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}, "workspace_customisation");
