import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { removePolicy } from "@/utils/policies/save";

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await removePolicy({ groupId: BigInt(String(req.query.id)), docId: String(req.query.docId), by: BigInt(req.session.userid) });
  return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
}, "delete_policies");
