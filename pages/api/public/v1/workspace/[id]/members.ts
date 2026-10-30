import prisma from "@/utils/database";
import { publicRoute } from "@/utils/publicApi/route";

// GET .../members: everyone with a role in the workspace.
export default publicRoute("GET", async ({ res, workspaceId }) => {
  const members = await prisma.user.findMany({
    where: { roles: { some: { workspaceGroupId: workspaceId } } },
    select: { userid: true, username: true, picture: true, roles: { where: { workspaceGroupId: workspaceId }, select: { id: true, name: true, permissions: true } } },
  });
  const shaped = members.map((m) => ({ userId: Number(m.userid), username: m.username, thumbnail: m.picture, role: m.roles[0] }));
  return res.status(200).json({ success: true, members: shaped, total: shaped.length });
});
