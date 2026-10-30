import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

// The workspace's people with their Roblox rank and role ids, for the pickers and the permissions screens.

export default withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);

  try {
    const people = await prisma.user.findMany({
      where: { roles: { some: { workspaceGroupId: groupId } } },
      select: {
        username: true,
        userid: true,
        registered: true,
        picture: true,
        ranks: { where: { workspaceGroupId: groupId }, select: { rankId: true } },
        roles: { where: { workspaceGroupId: groupId }, select: { id: true } },
      },
    });
    return res.status(200).json(
      people.map((u) => ({
        userid: u.userid.toString(),
        username: u.username,
        picture: u.picture,
        registered: u.registered ?? false,
        rankId: u.ranks[0]?.rankId != null ? Number(u.ranks[0].rankId) : null,
        roleIds: u.roles.map((r) => r.id),
      }))
    );
  } catch (error) {
    console.error("Error fetching workspace users:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});
