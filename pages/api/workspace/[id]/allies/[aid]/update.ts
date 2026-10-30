import type { NextApiRequest, NextApiResponse } from "next";
import { withAllyAccess } from "@/utils/allies/access";
import { updateDetails } from "@/utils/allies/service";
import { ids, send } from "@/utils/allies/http";

// The Discord invite, the other group's representatives and (for those who may) ours. The rights are checked in utils/allies/service.ts.
export default withAllyAccess(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
    return send(res, await updateDetails({ ...ids(req), body: req.body }));
  },
  { permissions: { POST: ["edit_alliance_details", "assign_alliance_representatives"] }, reps: true }
);
