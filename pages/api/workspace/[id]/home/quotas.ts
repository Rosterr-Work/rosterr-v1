import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadHomeQuotas } from "@/utils/home/data";

// The My Quotas box: this person's quotas and how far along each is, worked out by the same rule as the Quotas page and the profile.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  try {
    return res.status(200).json({ success: true, quotas: await loadHomeQuotas(parseInt(String(req.query.id), 10), req.session.userid as number) });
  } catch (error) {
    console.error("Error fetching quota progress:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
