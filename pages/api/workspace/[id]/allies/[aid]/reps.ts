import type { NextApiRequest, NextApiResponse } from "next";
import { withAllyAccess } from "@/utils/allies/access";
import { setReps } from "@/utils/allies/service";
import { ids, send } from "@/utils/allies/http";

// Chooses who represents the alliance for us: people who can assign representatives, from those who can represent.
export default withAllyAccess(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") return res.status(405).json({ success: false, error: "Method not allowed" });
    if (!Array.isArray(req.body?.reps)) return res.status(400).json({ success: false, error: "Missing content" });
    return send(res, await setReps({ ...ids(req), reps: req.body.reps }));
  },
  { permissions: { PATCH: ["assign_alliance_representatives"] }, reps: false }
);
