import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadFor, saveFor } from "@/utils/member/birthday";

// Another member's birthday, for people who may edit member details.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const target = String(req.query.userId ?? "");
  if (!/^\d{1,19}$/.test(target)) return res.status(400).json({ success: false, error: "Invalid target user id" });
  const actor = req.session.userid as number;
  if (req.method === "GET") {
    const done = await loadFor(groupId, actor, BigInt(target));
    return done.ok ? res.status(200).json({ success: true, birthdayDay: done.birthdayDay, birthdayMonth: done.birthdayMonth }) : res.status(done.status).json({ success: false, error: done.error });
  }
  if (req.method === "PUT") {
    const done = await saveFor(groupId, actor, BigInt(target), req.body ?? {});
    return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
