import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

// The workspaces platform staff have marked Verified or Partner (set from the platform portal). `groupIds` lists
// every badged workspace, as older builds expect; `badges` says which badge each one has.
async function fetchBadges(): Promise<Record<string, "VERIFIED" | "PARTNER">> {
  const rows = await prisma.workspace.findMany({ where: { badge: { not: null } }, select: { groupId: true, badge: true } });
  const badges: Record<string, "VERIFIED" | "PARTNER"> = {};
  for (const row of rows) if (row.badge) badges[row.groupId.toString()] = row.badge;
  return badges;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const badges = await fetchBadges();
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({ groupIds: Object.keys(badges).map(Number), badges });
}

export { fetchBadges };
