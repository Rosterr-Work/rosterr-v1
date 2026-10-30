import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createDoc } from "@/utils/docs/service";

export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const made = await createDoc({ groupId: BigInt(String(req.query.id)), by: BigInt(req.session.userid) }, req.body);
  return made.ok ? res.status(200).json({ success: true, document: made.document }) : res.status(made.status).json({ success: false, error: made.error });
}, "create_docs");
