import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createKey } from "@/utils/settings/apikeys";

// Makes an API key. The key itself is in this answer and nowhere else: only its hash is kept.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const done = await createKey(parseInt(String(req.query.id), 10), Number(req.session.userid), req.body);
    return done.ok ? res.status(200).json({ success: true, apiKey: done.apiKey }) : res.status(done.status).json({ success: false, error: done.error });
  } catch (error) {
    console.error("Error creating API key:", error);
    return res.status(500).json({ success: false, error: "Failed to create API key" });
  }
}, "manage_apikeys");
