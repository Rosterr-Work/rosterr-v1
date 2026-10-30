import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { getRankInGroup, MIN_OWNER_RANK } from "@/utils/roblox";
import { getDisplayName, getThumbnail, getUsername } from "@/utils/userinfoEngine";
import { createWorkspace, finishWorkspaceSetup } from "@/utils/workspace/create";
import { setConfig } from "@/utils/configEngine";
import { themeToHex } from "@/utils/theme";

// The first workspace of a fresh install: POST { groupid, color, robloxApiKey? }. It only works while there is no workspace at all, and the
// person has to hold a high enough rank in the group (like creating any later workspace through /api/createws).
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Please sign in first." });
  if (!req.body || typeof req.body !== "object") return res.status(400).json({ success: false, error: "Invalid request body - must be JSON" });

  const { groupid, color } = req.body as { groupid?: unknown; color?: unknown };
  let robloxApiKey = typeof req.body.robloxApiKey === "string" ? req.body.robloxApiKey.trim() : "";
  if (!groupid || !color) return res.status(400).json({ success: false, error: "Missing required fields" });
  const groupId = typeof groupid === "string" ? (/^\d+$/.test(groupid) ? parseInt(groupid, 10) : NaN) : Number(groupid);
  if (!Number.isInteger(groupId) || groupId <= 0) return res.status(400).json({ success: false, error: "Invalid groupid" });
  if (typeof color !== "string" || !themeToHex(color)) return res.status(400).json({ success: false, error: "That isn't a colour" });

  try {
    if (await prisma.workspace.findFirst({ select: { groupId: true } })) return res.status(403).json({ success: false, error: "Workspace already exists" });

    const rank = await getRankInGroup(groupId, userId);
    if (!rank || rank < MIN_OWNER_RANK) return res.status(400).json({ success: false, error: "You are not a high enough rank" });

    const created = await createWorkspace({ groupId, ownerUserId: BigInt(userId), robloxApiKey: robloxApiKey || undefined });
    if (!created.ok) return res.status(created.reason === "exists" ? 403 : 500).json({ success: false, error: created.error });

    await Promise.all([setConfig("theme", color, groupId), setConfig("customization", color, groupId), prisma.user.update({ where: { userid: BigInt(userId) }, data: { isOwner: true } })]);
    await finishWorkspaceSetup(groupId, BigInt(userId), rank, created.workspace.groupName, created.workspace.groupLogo);

    return res.status(200).json({
      success: true,
      user: { userId, username: await getUsername(userId), displayname: await getDisplayName(userId), thumbnail: getThumbnail(userId), isOwner: true },
    });
  } catch (error) {
    console.error("[setupworkspace]", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export { handler };
export default withSessionRoute(handler);
