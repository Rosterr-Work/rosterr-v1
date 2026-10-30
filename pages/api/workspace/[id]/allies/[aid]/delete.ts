import type { NextApiRequest, NextApiResponse } from "next";
import { withAllyAccess } from "@/utils/allies/access";
import { removeAlly } from "@/utils/allies/service";
import { ids, send } from "@/utils/allies/http";

// Removes an alliance and its visits.
export default withAllyAccess(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
    return send(res, await removeAlly(ids(req)));
  },
  { permissions: { DELETE: ["delete_alliances"] }, reps: false }
);
