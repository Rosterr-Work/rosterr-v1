import { audienceFilter, loadViewer } from "@/utils/documents/audience";
import { loadAccess } from "@/utils/access/store";
import prisma from "@/utils/database";
import { publicRoute } from "@/utils/publicApi/route";

// GET .../docs: the workspace's documents, newest change first. Policies (documents people must agree to) are not shared this way.
// Documents a key can read are those its creator can see on the website: restricted to certain roles or departments means those people (admins see all).
const audienceOf = async (workspaceId: number, creatorId: bigint) => {
  const access = await loadAccess(creatorId, workspaceId);
  if (access?.admin) return {};
  const viewer = await loadViewer(workspaceId, creatorId);
  return viewer.isMember ? audienceFilter(viewer.roleIds, viewer.departmentIds) : { id: "" };
};
const author = { select: { userid: true, username: true, picture: true } } as const;

export default publicRoute("GET", async ({ res, workspaceId, key }) => {
  const docs = await prisma.staffDocument.findMany({
    where: { workspaceGroupId: workspaceId, requiresAcknowledgment: false, ...(await audienceOf(workspaceId, key.createdById)) },
    include: { owner: author, roles: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const shaped = docs.map((d) => ({
    id: d.id,
    name: d.name,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    author: { userId: Number(d.owner.userid), username: d.owner.username, thumbnail: d.owner.picture },
    roles: d.roles.map((r) => ({ id: r.id, name: r.name })),
  }));
  return res.status(200).json({ success: true, documents: shaped, total: shaped.length });
});
