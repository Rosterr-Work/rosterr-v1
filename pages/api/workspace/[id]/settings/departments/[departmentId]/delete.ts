import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { deleteDepartment } from "@/utils/settings/departments";

// Removes a department and everything that pointed at it.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await deleteDepartment(parseInt(String(req.query.id), 10), Number(req.session.userid), String(req.query.departmentId));
  return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
}, "admin");
