import prisma from "@/utils/database";
import { fail, publicRoute } from "@/utils/publicApi/route";
import { rolesOf } from "@/utils/publicApi/sessions";

// GET .../sessions/{id}/roles: each role of the session and who holds it.
export default publicRoute("GET", async ({ req, res, workspaceId }) => {
  const sessionId = String(req.query.sessionId ?? "");
  if (!sessionId) return fail(res, 400, "Missing session ID");
  const session = await prisma.workspaceSession.findFirst({
    where: { id: sessionId, sessionType: { workspaceGroupId: workspaceId } },
    include: { sessionType: true, users: { include: { user: { select: { userid: true, username: true, displayName: true, picture: true } } } } },
  });
  if (!session) return fail(res, 404, "Session not found");
  return res.status(200).json({ success: true, session: rolesOf(session as any) });
});
