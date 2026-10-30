import prisma from "./database";
import { pushToUser } from "./push";

// Writes an in-app notification and sends the same thing to the person's phone. Only the server creates these (the bell and the
// phone apps read them): see utils/notify for what the bell shows.

export const NOTIFICATION_TYPES = [
  "notice_approved", "notice_denied", "notice_submitted", "notice_review", "notice_starting", "notice_ending",
  "userbook_warning", "userbook_promotion", "userbook_demotion", "userbook_termination", "userbook_resignation",
  "session_started", "session_reminder", "session_assigned", "session_cover",
  "moderation_appeal", "moderation_case",
  "policy_reminder", "quota_assigned", "goal_assigned", "recommendation_created", "recognition_received", "poll_created", "changelog", "custom",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export async function createNotification(userId: bigint | number, workspaceGroupId: bigint | number, type: NotificationType, title: string, body: string, href?: string) {
  const user = BigInt(userId);
  const group = BigInt(workspaceGroupId);
  const created = await prisma.inboxNotification.create({ data: { userId: user, workspaceGroupId: group, type, title, body, href: href ?? null } });
  // Not awaited: a failed or slow push must never hold up or break whatever caused the notification.
  void pushToUser(user, { type, title, body, href, groupId: group, notificationId: created.id });
}
