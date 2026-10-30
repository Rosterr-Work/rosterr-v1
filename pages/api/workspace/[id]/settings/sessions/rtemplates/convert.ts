import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { legacyFix, legacyStatus, type LegacyAction } from "@/utils/sessions/templates";

// Repairs for sessions made before role templates existed. GET says how much each repair would touch; POST ({ action }) does one:
// "import" makes templates from hand-named slots, "patch-host-roles" fills in missing host roles, "add-host-records" records hosts.
const ACTIONS: LegacyAction[] = ["import", "patch-host-roles", "add-host-records"];

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (req.method === "GET") return res.status(200).json({ success: true, ...(await legacyStatus(groupId)) });
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const asked = req.body?.action ?? "import";
  if (!ACTIONS.includes(asked)) return res.status(400).json({ success: false, error: "Unknown repair" });
  const done = await legacyFix(groupId, asked);
  if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
  return res.status(200).json({ success: true, changed: done.changed, templates: done.templates ?? [] });
}, "manage_features");
