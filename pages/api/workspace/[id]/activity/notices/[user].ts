import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

// The signed-in person's own notices that are not approved (waiting, turned down or cancelled), for the phone apps. Only their own: the
// number in the address has to be theirs.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (String(req.session.userid) !== String(req.query.user)) return res.status(401).json({ success: false, error: "Not allowed" });
  const rows = await prisma.leaveNotice.findMany({
    where: { userId: BigInt(req.session.userid), workspaceGroupId: parseInt(req.query.id as string, 10), approved: false },
    include: { user: { select: { userid: true, username: true, picture: true } } },
    orderBy: { startTime: "desc" },
  });
  const notices = rows.map((n) => ({
    id: n.id,
    userId: n.userId.toString(),
    startTime: n.startTime,
    endTime: n.endTime,
    reason: n.reason,
    approved: n.approved,
    reviewed: n.reviewed,
    revoked: n.revoked,
    workspaceGroupId: n.workspaceGroupId.toString(),
    reviewComment: n.reviewComment,
    createdAt: n.createdAt,
    user: { userid: n.user.userid.toString(), username: n.user.username, picture: n.user.picture },
  }));
  return res.status(200).json({ success: true, notices });
}, "create_notices");
