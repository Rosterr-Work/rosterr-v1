import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig, setConfig } from "@/utils/configEngine";
import { readResetSchedule } from "@/utils/activity/schedule";

// When the activity period resets by itself (weekly, every two weeks or monthly, on a Sunday or a Monday). The cron does the reset.

export default withPermissionCheck(handler, "admin");

async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; schedule?: unknown; error?: string }>) {
  const groupId = Number(req.query.id);
  try {
    if (req.method === "GET") return res.status(200).json({ success: true, schedule: await getConfig("activity_reset_schedule", groupId) });
    if (req.method === "POST") {
      const read = readResetSchedule(req.body);
      if (!read.ok) return res.status(400).json({ success: false, error: read.error });
      await setConfig("activity_reset_schedule", read.schedule, groupId);
      return res.status(200).json({ success: true, schedule: read.schedule });
    }
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Error with the reset schedule:", error);
    return res.status(500).json({ success: false, error: "Failed to save schedule" });
  }
}
