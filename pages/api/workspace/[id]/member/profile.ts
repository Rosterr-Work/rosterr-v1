import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadIntro, saveIntro } from "@/utils/member/intro";

// A member's introduction (message and favourite song): GET reads yours, or another member's with ?userId; PUT changes yours.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const me = req.session.userid as number;
  if (req.method === "GET") {
    const target = req.query.userId ? String(req.query.userId) : undefined;
    if (target !== undefined && !/^\d{1,19}$/.test(target)) return res.status(400).json({ success: false, error: "Invalid user id" });
    const done = await loadIntro(groupId, me, target === undefined ? undefined : BigInt(target));
    return done.ok ? res.status(200).json({ success: true, profile: done.profile }) : res.status(done.status).json({ success: false, error: done.error });
  }
  if (req.method === "PUT" || req.method === "PATCH") {
    const done = await saveIntro(groupId, me, req.body);
    return done.ok ? res.status(200).json({ success: true, profile: done.profile }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
