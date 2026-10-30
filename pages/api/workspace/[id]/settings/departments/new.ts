import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createDepartment } from "@/utils/settings/departments";

// Adds a department (named "New department" unless a name is sent).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await createDepartment(parseInt(String(req.query.id), 10), Number(req.session.userid), req.body);
  return done.ok ? res.status(200).json({ success: true, department: done.department }) : res.status(done.status).json({ success: false, error: done.error });
}, "admin");
