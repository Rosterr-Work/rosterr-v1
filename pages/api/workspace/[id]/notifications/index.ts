import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { dismissMessages, isMessageNotificationId, markMessagesRead, messagesAsNotifications } from "@/utils/platform/messages";

// A member's own notifications in this workspace: read them, mark them read, and clear them. Only their own, and only as a member.
// (Notifications are made by the server when something happens; there is no way to post one from here.)
// Messages from the Rosterr team ride along in the same list (ids that start "pm:"), so every app and the web bell show them.

const MAX_IDS = 100;
const readIds = (body: unknown): string[] => {
  const ids = (body as { ids?: unknown } | null)?.ids;
  return Array.isArray(ids) ? ids.filter((i): i is string => typeof i === "string").slice(0, MAX_IDS) : [];
};

export default withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse) => {
  const userId = BigInt(req.session.userid);
  const workspaceGroupId = BigInt(req.query.id as string);
  const mine = { userId, workspaceGroupId };

  if (req.method === "GET") {
    const [rows, fromRosterr] = await Promise.all([
      prisma.inboxNotification.findMany({ where: mine, orderBy: { createdAt: "desc" }, take: 50 }),
      messagesAsNotifications(userId, workspaceGroupId),
    ]);
    const merged = [
      ...rows.map((n) => ({ ...n, userId: n.userId.toString(), workspaceGroupId: n.workspaceGroupId.toString(), createdAt: n.createdAt.toISOString() })),
      ...fromRosterr,
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 50);
    return res.status(200).json({ success: true, notifications: merged, unreadCount: merged.filter((n) => !n.read).length });
  }

  if (req.method === "PATCH") {
    const ids = readIds(req.body);
    const own = ids.filter((i) => !isMessageNotificationId(i));
    if (!ids.length || own.length) {
      await prisma.inboxNotification.updateMany({ where: ids.length ? { ...mine, id: { in: own } } : { ...mine, read: false }, data: { read: true } });
    }
    await markMessagesRead(userId, ids);
    return res.status(200).json({ success: true });
  }

  if (req.method === "DELETE") {
    const ids = readIds(req.body);
    const own = ids.filter((i) => !isMessageNotificationId(i));
    if (!ids.length || own.length) {
      await prisma.inboxNotification.deleteMany({ where: ids.length ? { ...mine, id: { in: own } } : mine });
    }
    await dismissMessages(userId, ids);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
});
