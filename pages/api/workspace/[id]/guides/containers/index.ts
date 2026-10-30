import type { NextApiRequest, NextApiResponse } from "next";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { docRightsOf } from "@/utils/docs/rules";
import { createFolder } from "@/utils/docs/service";
import { withPermissionCheck } from "@/utils/permissionsManager";

// Making a folder for documents. (Listing them is part of GET .../docs/overview.)
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id), 10);
  const access = await loadAccess(req.session.userid, groupId);
  if (!access) return res.status(403).json({ success: false, error: "Forbidden" });
  const made = await createFolder({ groupId: BigInt(groupId), by: BigInt(req.session.userid) }, docRightsOf((p) => allows(access, p)), req.body);
  return made.ok ? res.status(200).json({ success: true, container: made.container }) : res.status(made.status).json({ success: false, error: made.error });
});
