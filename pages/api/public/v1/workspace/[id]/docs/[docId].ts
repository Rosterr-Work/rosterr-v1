import { audienceFilter, loadViewer } from "@/utils/documents/audience";
import { loadAccess } from "@/utils/access/store";
import prisma from "@/utils/database";
import { fail, publicRoute } from "@/utils/publicApi/route";

// Documents a key can read are those its creator can see on the website: restricted to certain roles or departments means those people (admins see all).
const audienceOf = async (workspaceId: number, creatorId: bigint) => {
  const access = await loadAccess(creatorId, workspaceId);
  if (access?.admin) return {};
  const viewer = await loadViewer(workspaceId, creatorId);
  return viewer.isMember ? audienceFilter(viewer.roleIds, viewer.departmentIds) : { id: "" };
};

// GET .../docs/{docId}: one document with its content. Policies are left out, as in the list.
export default publicRoute("GET", async ({ req, res, workspaceId, key }) => {
  const doc = await prisma.staffDocument.findFirst({
    where: { id: String(req.query.docId ?? ""), workspaceGroupId: workspaceId, requiresAcknowledgment: false, ...(await audienceOf(workspaceId, key.createdById)) },
    include: { owner: { select: { userid: true, username: true, picture: true } }, roles: { select: { id: true, name: true } } },
  });
  if (!doc) return fail(res, 404, "Document not found");
  return res.status(200).json({
    success: true,
    document: {
      id: doc.id,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      content: doc.content,
      author: { userId: Number(doc.owner.userid), username: doc.owner.username, thumbnail: doc.owner.picture },
      roles: doc.roles.map((r) => ({ id: r.id, name: r.name })),
    },
  });
});
