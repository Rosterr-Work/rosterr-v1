import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { submitNotice } from "@/utils/notices/service";

// The signed-in person asks for leave: `{ startTime, endTime, reason }` (times as milliseconds or dates). It waits for review.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    const made = await submitNotice({ groupId: parseInt(req.query.id as string, 10), userId: req.session.userid, body: req.body });
    if (!made.ok) return res.status(made.status).json({ success: false, error: made.error });
    return res.status(200).json({ success: true, notice: JSON.parse(JSON.stringify(made.notice, (_k, v) => (typeof v === "bigint" ? v.toString() : v))) });
  } catch (error) {
    console.error("[notices] couldn't submit:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}, "create_notices");
