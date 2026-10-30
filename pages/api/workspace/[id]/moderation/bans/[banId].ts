import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { actorOf, groupOf, sendData, sendFail } from "@/utils/moderation/http";
import { removeBan } from "@/utils/moderation/service";

// GET: one ban. DELETE: lift it.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const banId = String(req.query.banId ?? "");
  try {
    if (req.method === "GET") {
      const ban = await prisma.ban.findFirst({ where: { id: banId, workspaceGroupId: groupOf(req) } });
      return ban ? sendData(res, ban) : res.status(404).json({ success: false, error: "Ban not found" });
    }
    if (req.method === "DELETE") {
      const r = await removeBan({ groupId: groupOf(req), actorId: actorOf(req), banId });
      if (!r.ok) return sendFail(res, r);
      return sendData(res, r.ban, 200, { message: "User unbanned successfully" });
    }
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("[moderation] ban:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}, ["execute_bans"]);
