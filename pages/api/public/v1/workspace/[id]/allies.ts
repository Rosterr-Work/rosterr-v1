import prisma from "@/utils/database";
import { publicRoute } from "@/utils/publicApi/route";

// GET .../allies: the workspace's alliances with their representatives and the latest five visits.
const person = { select: { userid: true, username: true, picture: true } } as const;

export default publicRoute("GET", async ({ res, workspaceId }) => {
  const allies = await prisma.alliance.findMany({
    where: { workspaceGroupId: workspaceId },
    include: { reps: person, allyVisits: { orderBy: { time: "desc" }, take: 5, include: { host: person } } },
  });
  const shaped = allies.map((a) => ({
    id: a.id,
    name: a.name,
    groupId: a.groupId,
    icon: a.icon,
    notes: a.notes,
    representatives: a.reps.map((r) => ({ userId: Number(r.userid), username: r.username, thumbnail: r.picture, profileUrl: `https://www.roblox.com/users/${r.userid}/profile` })),
    recentVisits: a.allyVisits.map((v) => ({ id: v.id, time: v.time, name: v.name, host: { userId: Number(v.host.userid), username: v.host.username, thumbnail: v.host.picture } })),
  }));
  return res.status(200).json({ success: true, allies: shaped, total: shaped.length });
});
