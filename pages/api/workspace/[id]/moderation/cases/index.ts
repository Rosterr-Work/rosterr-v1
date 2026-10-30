import type { NextApiRequest, NextApiResponse } from "next";
import { actorOf, groupOf, guarded, sendData, sendFail } from "@/utils/moderation/http";
import { createCase, listCases } from "@/utils/moderation/service";

// GET: the cases (filter by status, action, targetUserId, createdBy, search; sort; page). POST: open a case.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const r = await listCases(groupOf(req), req.query);
      if (!r.ok) return sendFail(res, r);
      return sendData(res, { cases: r.cases, pagination: r.pagination });
    }
    const r = await createCase({ groupId: groupOf(req), actorId: actorOf(req), body: req.body });
    if (!r.ok) return sendFail(res, r);
    return sendData(res, r.case, 201);
  } catch (error) {
    console.error("[moderation] cases:", error);
    return res.status(500).json({ success: false, error: req.method === "GET" ? "Failed to fetch moderation cases" : "Failed to create moderation case" });
  }
}

export default guarded(handler, { GET: ["view_moderation"], POST: ["create_moderation_cases"] });
