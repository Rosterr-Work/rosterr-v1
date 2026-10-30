import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadBirthday, saveMine } from "@/utils/member/birthday";

// A member's own birthday: GET reads it, POST ({ day, month, timezone }) sets it, or clears it with zeros. Members only.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const userId = req.session.userid as number;
  if (req.method === "GET") return res.status(200).json({ success: true, ...(await loadBirthday(groupId, userId)) });
  if (req.method === "POST") {
    const done = await saveMine(groupId, userId, req.body ?? {});
    return done.ok ? res.status(200).json({ success: true }) : res.status(done.status).json({ success: false, error: done.error });
  }
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
