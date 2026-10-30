import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";
import { createPolicy } from "@/utils/policies/save";

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id), 10);
  if (!(await getConfig("policies", groupId))?.enabled) return res.status(404).json({ success: false, error: "Policies feature not enabled" });
  const made = await createPolicy({ groupId: BigInt(groupId), by: BigInt(req.session.userid), body: req.body });
  return made.ok ? res.status(200).json({ success: true, document: made.document }) : res.status(made.status).json({ success: false, error: made.error });
}, "create_policies");
