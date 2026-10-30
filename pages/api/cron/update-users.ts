import type { NextApiRequest, NextApiResponse } from "next";
import { cronGuard } from "@/utils/cron/guard";
import { syncUsers } from "@/utils/cron/usersync";

// Run about once a day: refreshes every account's username and display name from Roblox.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!cronGuard(req, res)) return;
  try {
    const result = await syncUsers({ multiContainer: process.env.NEXT_MULTI?.toLowerCase() === "true" });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("[User Sync] Fatal error:", error);
    return res.status(500).json({ success: false, error: error.message || "Unknown error" });
  }
}
