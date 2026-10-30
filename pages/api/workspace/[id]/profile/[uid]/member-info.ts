import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { updateDetails } from "@/utils/member/details";

// PATCH { departmentIds?, lineManagerId?, timezone?, birthdayDay?, birthdayMonth?, discordId?, email? }: change a member's details.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ success: false, error: "Method not allowed" });
  const uid = String(req.query.uid ?? "");
  if (!/^\d{1,19}$/.test(uid)) return res.status(400).json({ success: false, error: "Missing workspace ID or user ID" });
  try {
    const done = await updateDetails({ groupId: parseInt(req.query.id as string, 10), actorId: BigInt(req.session.userid), userId: BigInt(uid), body: req.body });
    if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[member] details:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}, "edit_member_details");
