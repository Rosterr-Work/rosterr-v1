import type { NextApiRequest, NextApiResponse } from "next";
import { withAllyAccess } from "@/utils/allies/access";
import { deleteVisit, editVisit } from "@/utils/allies/service";
import { ids, send } from "@/utils/allies/http";

// Changes or removes one visit of this alliance.
export default withAllyAccess(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    const base = { ...ids(req), visitId: String(req.query.vid ?? "") };
    if (req.method === "PATCH") return send(res, await editVisit({ ...base, body: req.body }));
    if (req.method === "DELETE") return send(res, await deleteVisit(base));
    return res.status(405).json({ success: false, error: "Method not allowed" });
  },
  { permissions: { DELETE: ["delete_alliance_visits"], PATCH: ["edit_alliance_visits"] }, reps: true }
);
