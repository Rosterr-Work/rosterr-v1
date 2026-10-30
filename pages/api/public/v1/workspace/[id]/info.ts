import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";
import { getGroupInfo, getGroupLogo } from "@/utils/roblox";
import { themeToHex } from "@/utils/theme";
import { fail, publicRoute } from "@/utils/publicApi/route";

// GET .../info: the workspace's group (name, description, logo, members), its colour and its roles.
export default publicRoute("GET", async ({ res, workspaceId }) => {
  const workspace = await prisma.workspace.findUnique({ where: { groupId: workspaceId }, include: { roles: { select: { id: true, name: true, groupRoles: true } } } });
  if (!workspace) return fail(res, 404, "Workspace not found");
  const [group, logo, colour] = await Promise.all([getGroupInfo(Number(workspace.groupId)).catch(() => null) as Promise<any>, getGroupLogo(Number(workspace.groupId)), getConfig("theme", workspace.groupId)]);
  return res.status(200).json({
    workspace: {
      name: group?.name ?? workspace.groupName,
      groupId: workspace.groupId,
      description: group?.description ?? null,
      logo,
      memberCount: group?.memberCount ?? null,
      colour: themeToHex(colour),
      roles: workspace.roles,
    },
    success: true,
  });
});
