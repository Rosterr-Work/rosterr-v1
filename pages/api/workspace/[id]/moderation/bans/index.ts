import type { NextApiRequest, NextApiResponse } from "next";
import { actorOf, groupOf, guarded, sendData, sendFail } from "@/utils/moderation/http";
import { idOf } from "@/utils/moderation/caseRules";
import { banStatus, executeBan } from "@/utils/moderation/service";

// GET ?userId=: is this player banned? POST: ban a player, optionally carrying out a case ({ userId, reason, duration | expiresAt | isPermanent, caseId }).
// Looking a ban up needs a moderation right (it used to need none, so anyone signed in could ask about any player).
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const userId = idOf(String(req.query.userId ?? ""));
      if (!userId) return res.status(400).json({ success: false, error: "userId is required" });
      return sendData(res, { ...(await banStatus(groupOf(req), userId)), userId: String(req.query.userId) });
    }
    const r = await executeBan({ groupId: groupOf(req), actorId: actorOf(req), body: req.body });
    if (!r.ok) return sendFail(res, r);
    return sendData(res, { ban: r.ban, message: r.message }, 201);
  } catch (error) {
    console.error("[moderation] bans:", error);
    return res.status(500).json({ success: false, error: req.method === "GET" ? "Failed to check ban status" : "Failed to execute ban" });
  }
}

export default guarded(handler, { GET: ["view_moderation", "execute_punishments", "execute_bans"], POST: ["execute_punishments"] });
