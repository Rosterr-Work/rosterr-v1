import type { NextApiRequest, NextApiResponse } from "next";
import { withAllyAccess } from "@/utils/allies/access";
import { addVisit } from "@/utils/allies/service";
import { ids, send } from "@/utils/allies/http";

// Records a visit or event with an allied group; the person recording it is the host. The phone apps use this route.
export default withAllyAccess(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
    return send(res, await addVisit({ ...ids(req), body: req.body }));
  },
  { permissions: { POST: ["add_alliance_visits"] }, reps: true }
);
