import prisma from "@/utils/database";
import { daysUntilBirthday } from "@/utils/home/data-pure";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET .../birthdays?days=7&date=2026-10-12: members whose birthday falls in the next `days` days (1 to 14) counted from `date`, or today.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const asked = Number.parseInt(String(req.query.days ?? "7"));
  const days = Number.isNaN(asked) ? 7 : Math.min(Math.max(asked, 1), 14);
  const from = req.query.date ? new Date(String(req.query.date)) : new Date();
  if (Number.isNaN(from.getTime())) return fail(res, 400, "date must be a valid date");

  const rows = await prisma.membership.findMany({
    where: { workspaceGroupId: workspaceId, birthdayDay: { gt: 0 }, birthdayMonth: { gt: 0 } },
    select: { birthdayDay: true, birthdayMonth: true, user: { select: { userid: true, username: true } } },
  });
  const upcoming = rows
    .map((m) => {
      const away = daysUntilBirthday(m.birthdayMonth as number, m.birthdayDay as number, from);
      const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + away);
      return {
        username: m.user.username || String(m.user.userid),
        userId: Number(m.user.userid),
        birthdayMonth: m.birthdayMonth,
        birthdayDay: m.birthdayDay,
        daysAway: away,
        nextBirthday: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
      };
    })
    .filter((m) => m.daysAway <= days)
    .sort((a, b) => a.daysAway - b.daysAway);
  const reference = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
  return res.status(200).json({ success: true, birthdays: upcoming, total: upcoming.length, filterDays: days, referenceDate: reference });
});
