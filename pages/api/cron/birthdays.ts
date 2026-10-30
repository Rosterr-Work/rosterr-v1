import type { NextApiRequest, NextApiResponse } from "next";
import { cronGuard } from "@/utils/cron/guard";
import { announceBirthdays } from "@/utils/birthdays/announce";

// Run about once an hour: announces today's birthdays for workspaces that have a birthday channel or webhook (each at most once a day).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!cronGuard(req, res)) return;
  try {
    const results = await announceBirthdays();
    return res.status(200).json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error("[birthdays] cron failed:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
