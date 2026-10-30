import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getThumbnail } from "@/utils/userinfoEngine";

// Finds people of this workspace by part of their username (for the pickers: sharing, goals, recommendations, tasks). Only its own
// members come back, never everyone who has an account.

export default withPermissionCheck(handler, "view_members");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string; users?: { userid: string; username: string; thumbnail: string }[] }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });

  const term = String(req.query.username ?? "").trim().slice(0, 50);
  if (!term) return res.status(200).json({ success: true, users: [] });

  try {
    const people = await prisma.user.findMany({
      where: { username: { contains: term }, workspaceMemberships: { some: { workspaceGroupId: BigInt(parseInt(req.query.id as string)) } } },
      select: { userid: true, username: true },
      orderBy: { username: "asc" },
      take: 10,
    });
    return res.status(200).json({ success: true, users: people.map((u) => ({ userid: u.userid.toString(), username: u.username ?? "", thumbnail: getThumbnail(u.userid) })) });
  } catch (error) {
    console.error("Staff search failed:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
