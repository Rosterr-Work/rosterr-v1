import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { checkSpecificUser } from "@/utils/permissionsManager";
import { forgetAccess } from "@/utils/waitlist";

// "Check roles": looks at the signed-in person's Roblox rank in each workspace's group and gives them the matching roles. For someone
// who has just been ranked up and doesn't want to wait for the next sync.

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  const joined = await checkSpecificUser(userId);
  console.log(`[Roles] checked user ${userId}: ${joined ? "given a role" : "no workspace role found for their Roblox rank"}`);
  // They may now be on a workspace, which is what lets them in while Rosterr is coming soon: don't wait for the remembered answer to expire.
  forgetAccess(userId);
  return res.status(200).json({ success: true });
}
