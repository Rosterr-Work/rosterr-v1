import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { getDisplayName, getThumbnail, getUsername, UNKNOWN_USER } from "@/utils/userinfoEngine";
import { workspaceAllowance } from "@/utils/workspace/allowance";
import { hasEarlyAccess, hasLaunchAccess, waitlistMode } from "@/utils/waitlist";
import { isPlatformStaffCandidate } from "@/utils/platform/access";

// Who is signed in and which workspaces they are on: what the web app and the phone apps ask first.

type Me = {
  userId: number;
  username: string;
  displayname: string;
  thumbnail: string;
  canMakeWorkspace: boolean;
  needsEarlyAccess: boolean;
  registered: boolean;
  birthdayDay: number | null;
  birthdayMonth: number | null;
  isOwner: boolean;
  /** Whether the phone apps' account menu offers "Platform Admin": a cheap approximation of the real check, not the check itself. */
  platformStaffCandidate: boolean;
};
type WorkspaceRow = { groupId: number; groupThumbnail: string | null | undefined; groupName: string | null | undefined; ownerId: number | null; badge: "VERIFIED" | "PARTNER" | null };
type Answer = { success: boolean; error?: string; user?: Me; workspaces?: WorkspaceRow[] };

// The answer is kept for a few seconds per person: this is asked on every page load.
const KEEP_MS = 30_000;
const kept = new Map<number, { answer: Answer; at: number }>();
const keep = (userId: number, answer: Answer, now: number) => {
  if (kept.size > 5000) for (const [id, k] of kept) if (now - k.at > KEEP_MS) kept.delete(id);
  kept.set(userId, { answer, at: now });
};

const firstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function workspacesOf(roles: { workspaceGroupId: bigint }[]): Promise<WorkspaceRow[]> {
  return Promise.all(
    roles.map(async (role) => {
      const ws = await prisma.workspace.findUnique({
        where: { groupId: role.workspaceGroupId },
        select: { groupName: true, groupLogo: true, ownerId: true, badge: true },
      });
      return {
        groupId: Number(role.workspaceGroupId),
        groupThumbnail: ws?.groupLogo,
        groupName: ws?.groupName,
        ownerId: ws?.ownerId ? Number(ws.ownerId) : null,
        badge: (ws?.badge as WorkspaceRow["badge"]) ?? null,
      };
    })
  );
}

/** Saves the person's current Roblox name and avatar once the answer has gone out. */
async function refreshSavedProfile(userId: number) {
  try {
    const username = await getUsername(userId);
    if (username === UNKNOWN_USER) return; // never save "Unknown User" over a real name
    const fields = { picture: getThumbnail(userId), username, registered: true };
    await prisma.user.upsert({ where: { userid: BigInt(userId) }, update: fields, create: { userid: BigInt(userId), ...fields } });
    kept.delete(userId);
  } catch (error) {
    console.error("Error updating user info:", error);
  }
}

/** After a change to the account, so the next answer is read fresh rather than from what was kept. */
export const forgetMe = (userId: number | string) => void kept.delete(userId as any);

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Answer>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  const userId = req.session.userid;
  if (!userId) {
    // Half-way through signing in: say which half is missing.
    if (req.session.pendingDiscord) return res.status(401).json({ success: false, error: "roblox_verification_required" });
    if (req.session.pendingRoblox) return res.status(401).json({ success: false, error: "discord_link_required" });
    return res.status(401).json({ success: false, error: "Not logged in" });
  }
  // Not let in yet (Rosterr is "coming soon"): the site sends them to their application.
  if (waitlistMode() && !req.session.platformAccess && !(await hasLaunchAccess(userId))) return res.status(403).json({ success: false, error: "waitlist" });
  if (!(await prisma.workspace.count())) return res.status(400).json({ success: false, error: "Workspace not setup" });

  // On a workspace's own domain (proxy.ts sets this header) a person sees that workspace and no other.
  const onlyGroup = firstHeader(req.headers?.["x-rosterr-custom-group"]);
  const send = (answer: Answer) =>
    res.status(200).json(onlyGroup ? { ...answer, workspaces: (answer.workspaces ?? []).filter((w) => String(w.groupId) === onlyGroup) } : answer);

  const now = Date.now();
  const hit = kept.get(userId);
  if (hit && now - hit.at < KEEP_MS) return send(hit.answer);

  const [saved, robloxName, robloxDisplay] = await Promise.all([
    prisma.user.findUnique({ where: { userid: BigInt(userId) }, include: { roles: true } }),
    getUsername(userId),
    getDisplayName(userId),
  ]);
  if (saved?.banned) {
    req.session.destroy();
    return res.status(401).json({ success: false, error: "Your account has been suspended" });
  }

  // If Roblox couldn't be reached, use the names saved earlier rather than showing "Unknown User".
  const robloxDown = robloxName === UNKNOWN_USER;
  const username = robloxDown ? saved?.username || robloxName : robloxName;
  const displayname = robloxDown ? saved?.displayName || username : robloxDisplay;

  // Anyone may create a workspace until they own their limit (utils/workspaceLimit.ts). While Rosterr is "coming soon" it also
  // needs early access; being on one already doesn't.
  const needsEarlyAccess = waitlistMode() && !req.session.platformAccess && !(await hasEarlyAccess(userId));
  const canMakeWorkspace = !needsEarlyAccess && (await workspaceAllowance(userId)).canOwnMore;

  const answer: Answer = {
    success: true,
    user: {
      userId,
      username,
      displayname,
      thumbnail: getThumbnail(userId),
      canMakeWorkspace,
      needsEarlyAccess,
      registered: saved?.registered || false,
      birthdayDay: saved?.birthdayDay ?? null,
      birthdayMonth: saved?.birthdayMonth ?? null,
      isOwner: saved?.isOwner || false,
      platformStaffCandidate: await isPlatformStaffCandidate(saved?.discordId),
    },
    workspaces: await workspacesOf(saved?.roles ?? []),
  };

  // An answer built while Roblox was unreachable isn't kept, so the real names are fetched next time.
  if (!robloxDown) keep(userId, answer, now);
  send(answer);
  void refreshSavedProfile(userId);
}
