import prisma from "@/utils/database";
import { pushToUsers } from "@/utils/push";
import { safeHref } from "@/utils/notify/href";
import { fail, publicRoute } from "@/utils/publicApi/route";

// POST .../notifications { title, description, href? }: tells everyone in the workspace, in the app and as a ping. The link has to be a page
// of the app or an http(s) address.
export default publicRoute("POST", async ({ req, res, workspaceId }) => {
  const { title, description, href } = (req.body ?? {}) as { title?: unknown; description?: unknown; href?: unknown };
  if (typeof title !== "string" || !title.trim()) return fail(res, 400, "title is required");
  if (typeof description !== "string" || !description.trim()) return fail(res, 400, "description is required");
  if (title.trim().length > 100) return fail(res, 400, "title must be 100 characters or fewer");
  if (description.trim().length > 500) return fail(res, 400, "description must be 500 characters or fewer");
  if (href !== undefined && href !== null && href !== "" && typeof href !== "string") return fail(res, 400, "href must be a string");
  const link = typeof href === "string" && href.trim() ? safeHref(href) : null;
  if (typeof href === "string" && href.trim() && !link) return fail(res, 400, "href must be a page of the app or an http(s) address");

  const members = await prisma.membership.findMany({ where: { workspaceGroupId: workspaceId }, select: { userId: true } });
  if (members.length === 0) return res.status(200).json({ success: true, sent: 0 });

  const clean = { title: title.trim(), body: description.trim() };
  await prisma.inboxNotification.createMany({ data: members.map((m) => ({ userId: m.userId, workspaceGroupId: BigInt(workspaceId), type: "custom", ...clean, href: link })) });
  // Everyone also gets it as a ping, a few at a time.
  void pushToUsers(members.map((m) => m.userId), { type: "custom", ...clean, href: link, groupId: workspaceId });
  return res.status(201).json({ success: true, sent: members.length });
});
