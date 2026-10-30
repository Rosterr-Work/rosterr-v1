import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";
import { saveOrder } from "@/utils/settings/departments";

// The order departments are shown in: GET reads it, POST ({ order: [ids] }) sets it. Ids that aren't this workspace's are ignored.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (req.method === "GET") {
    const config = (await getConfig("directory", groupId)) as { departmentOrder?: string[] } | null;
    return res.status(200).json({ success: true, order: Array.isArray(config?.departmentOrder) ? config!.departmentOrder : [] });
  }
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!Array.isArray(req.body?.order)) return res.status(400).json({ success: false, error: "Order must be an array" });
  return res.status(200).json({ success: true, order: await saveOrder(groupId, req.body.order) });
}, "admin");
