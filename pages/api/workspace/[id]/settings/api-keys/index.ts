import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { listKeys } from "@/utils/settings/apikeys";

// The workspace's API keys, masked to their last four characters, with when and from where each was last used.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    return res.status(200).json({ success: true, apiKeys: await listKeys(parseInt(String(req.query.id), 10)) });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch API keys" });
  }
}, "manage_apikeys");
