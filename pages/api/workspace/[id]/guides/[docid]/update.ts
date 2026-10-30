import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { updateDoc } from "@/utils/docs/service";

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const done = await updateDoc({ groupId: BigInt(String(req.query.id)), by: BigInt(req.session.userid) }, String(req.query.docid), req.body);
  return done.ok ? res.status(200).json({ success: true, document: done.document }) : res.status(done.status).json({ success: false, error: done.error });
}, "edit_docs");
