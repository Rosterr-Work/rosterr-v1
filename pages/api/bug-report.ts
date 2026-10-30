import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { withSessionRoute } from "@/lib/withSession";
import { validateCsrf, validateCsrfToken } from "@/utils/csrf";
import { bugReportEmbed, readBugReport, reportAllowed } from "@/utils/help/bugReport";

// A signed-in person's bug report goes to the team's Discord channel (EZ_BUGS is the webhook). Five in ten minutes per person.

async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const webhook = process.env.EZ_BUGS;
  if (!webhook) return res.status(503).json({ success: false, error: "Bug reporting is not configured" });
  if (!req.session?.userid) return res.status(401).json({ success: false, error: "You must be logged in to submit a bug report" });

  if (!validateCsrf(req, res)) return res.status(403).json({ success: false, error: "Invalid request origin" });
  const token = req.headers["x-csrf-token"];
  if (typeof token !== "string" || !validateCsrfToken(token, req.session.userid)) return res.status(403).json({ success: false, error: "Invalid or expired CSRF token" });

  const userId = String(req.session.userid);
  if (!reportAllowed(userId)) return res.status(429).json({ success: false, error: "Too many bug reports. Please wait before submitting another." });

  const report = readBugReport(req.body);
  if ("error" in report) return res.status(400).json({ success: false, error: report.error });

  try {
    await axios.post(webhook, { embeds: [bugReportEmbed(report, userId)] }, { timeout: 8000 });
  } catch {
    return res.status(502).json({ success: false, error: "Failed to submit bug report. Please try again." });
  }
  return res.status(200).json({ success: true });
}

export default withSessionRoute(handler);
