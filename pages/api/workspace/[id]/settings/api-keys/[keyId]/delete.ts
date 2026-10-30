import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { deleteKey } from "@/utils/settings/apikeys";

// Removes an API key of this workspace. Whatever was using it stops working at once.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const done = await deleteKey(parseInt(String(req.query.id), 10), Number(req.session.userid), String(req.query.keyId ?? ""));
    return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return res.status(500).json({ success: false, error: "Failed to delete API key" });
  }
}, "manage_apikeys");
