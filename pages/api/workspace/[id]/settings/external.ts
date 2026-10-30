import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadExternal, saveExternal } from "@/utils/settings/external";

// The Roblox Open Cloud key and ranking service. GET shows them masked (?validate=true also tries the saved key); POST saves.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (!groupId) return res.status(400).json({ message: "Invalid workspace ID" });
  try {
    if (req.method === "GET") return res.status(200).json(await loadExternal(groupId, { validate: req.query.validate === "true" }));
    if (req.method === "POST") {
      const done = await saveExternal({ groupId, actorId: Number(req.session.userid) || null, body: req.body });
      return done.ok ? res.status(200).json({ message: "Settings saved successfully" }) : res.status(done.status).json({ message: done.error });
    }
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Error with external services settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}, "admin");
