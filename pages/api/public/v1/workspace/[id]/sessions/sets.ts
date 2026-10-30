import prisma from "@/utils/database";
import { publicRoute } from "@/utils/publicApi/route";

// GET .../sessions/sets: the workspace's role sets, which a new session type is built from (roleSetIds).
export default publicRoute("GET", async ({ res, workspaceId }) => {
  const sets = await prisma.slotTemplate.findMany({ where: { workspaceGroupId: workspaceId, archived: false }, include: { category: true }, orderBy: [{ weight: "asc" }, { createdAt: "asc" }] });
  return res.status(200).json({
    success: true,
    roleSets: sets.map((r) => ({ id: r.id, name: r.name, hostRole: r.hostRole ?? null, slots: r.slots, weight: r.weight, groupRoles: r.groupRoles, category: r.category ? { id: r.category.id, name: r.category.name, weight: r.category.weight } : null })),
  });
});
