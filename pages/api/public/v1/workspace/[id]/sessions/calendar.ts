import { fail, publicRoute } from "@/utils/publicApi/route";
import { calendar } from "@/utils/publicApi/sessions";

// GET .../sessions/calendar?startDate=&endDate=&category=: sessions in a date range, with who is in them, and grouped by day.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const { startDate, endDate, category } = req.query;
  if (!startDate || !endDate) return fail(res, 400, "Start date and end date are required");
  const start = new Date(String(startDate));
  const end = new Date(String(endDate));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail(res, 400, "startDate and endDate must be valid dates");
  const result = await calendar({ workspaceId, start, end, category: category ? String(category) : undefined });
  return res.status(200).json({ success: true, ...result, dateRange: { startDate: String(startDate), endDate: String(endDate) }, total: result.sessions.length });
});
