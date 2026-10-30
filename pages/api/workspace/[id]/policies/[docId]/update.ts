import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { updatePolicy } from "@/utils/policies/save";

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await updatePolicy({ groupId: BigInt(String(req.query.id)), docId: String(req.query.docId), by: BigInt(req.session.userid), body: req.body });
  return done.ok ? res.status(200).json({ success: true, document: done.document }) : res.status(done.status).json({ success: false, error: done.error });
}, "edit_policies");
