import prisma from "@/utils/database";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { pagination, readPaging } from "@/utils/publicApi/paging";

// GET .../userbook/entries: the logbook, newest first. Filter with userId and type; redacted entries are left out unless asked for.
const TYPES = ["warning", "promotion", "demotion", "termination", "rank-change", "resignation", "note"];
const person = { select: { userid: true, username: true, picture: true } } as const;

export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const paging = readPaging(req.query);
  if (!paging) return fail(res, 400, "limit and offset must be valid numbers");

  const where: any = { workspaceGroupId: workspaceId };
  if (req.query.userId) {
    const userId = Number.parseInt(String(req.query.userId));
    if (Number.isNaN(userId)) return fail(res, 400, "userId must be a valid number");
    where.userId = BigInt(userId);
  }
  if (req.query.type) {
    const type = String(req.query.type);
    if (!TYPES.includes(type)) return fail(res, 400, `Invalid type. Must be one of: ${TYPES.join(", ")}`);
    where.type = type === "rank-change" ? "rank_change" : type;
  }
  if (String(req.query.includeRedacted ?? "false").toLowerCase() !== "true") where.redacted = false;

  const [rows, total] = await Promise.all([
    prisma.logbookEntry.findMany({ where, include: { admin: person, user: person }, orderBy: { createdAt: "desc" }, take: paging.limit, skip: paging.offset }),
    prisma.logbookEntry.count({ where }),
  ]);

  return res.status(200).json({
    success: true,
    entries: rows.map((e) => ({
      id: e.id,
      userId: e.userId.toString(),
      type: e.type,
      reason: e.reason,
      adminId: e.adminId.toString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      workspaceGroupId: e.workspaceGroupId,
      rankAfter: e.rankAfter,
      rankBefore: e.rankBefore,
      rankNameAfter: e.rankNameAfter,
      rankNameBefore: e.rankNameBefore,
      redacted: e.redacted || false,
      redactedAt: e.redactedAt?.toISOString() || null,
      redactedBy: e.redactedBy?.toString() || null,
      admin: { userid: e.admin.userid.toString(), username: e.admin.username, picture: e.admin.picture },
      user: { userid: e.user.userid.toString(), username: e.user.username, picture: e.user.picture },
    })),
    pagination: pagination(total, paging),
  });
});
