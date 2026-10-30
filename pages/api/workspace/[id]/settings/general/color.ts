import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig, setConfig } from "@/utils/configEngine";
import { logAudit } from "@/utils/logs";
import { themeToHex } from "@/utils/theme";

// The workspace's accent colour: a palette key such as "bg-emerald-400", or "custom-" and six hex digits. Anything else is turned away.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id), 10);
  const color = req.body?.color;
  if (!groupId || typeof color !== "string" || !color) return res.status(400).json({ success: false, error: "Missing workspace ID or color" });
  if (themeToHex(color) === null) return res.status(400).json({ success: false, error: "That isn't a colour you can choose" });
  try {
    const before = await getConfig("theme", groupId);
    await setConfig("theme", color, groupId);
    await logAudit(groupId, Number(req.session.userid) || null, "settings.general.color.update", "theme", { before, after: color }).catch(() => {});
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to save theme color:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}, "workspace_customisation");
