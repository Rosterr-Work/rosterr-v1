import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createAlly } from "@/utils/allies/service";
import { send } from "@/utils/allies/http";

// Adds an allied group. See utils/allies/service.ts for the checks.
export default withPermissionCheck(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
    return send(res, await createAlly({ groupId: parseInt(String(req.query.id), 10), actorId: req.session.userid as number, body: req.body }));
  },
  "create_alliances"
);
