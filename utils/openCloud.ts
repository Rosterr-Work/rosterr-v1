import { readRobloxKey } from "@/utils/externalCredentials";

// Talking to Roblox with a workspace's Open Cloud API key: who is in the group, looking people up by id, and (for workspaces that rank
// through Roblox directly) moving people between roles.

const CLOUD = "https://apis.roblox.com/cloud/v2";
const GROUPS = "https://groups.roblox.com/v1";
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

export interface GroupMember { userId: number; roleId: number }
export interface RankingResponse { success: boolean; message?: string; error?: string }
type Role = { id: number; name: string; rank: number };

/** The key a workspace saved in Settings > Roblox & ranking, or null. */
export async function getWorkspaceRobloxApiKey(groupId: number): Promise<string | null> {
  const prisma = (await import("./database")).default;
  const row = await prisma.externalConnection.findUnique({ where: { workspaceGroupId: groupId }, select: { robloxApiKey: true } });
  return readRobloxKey(row?.robloxApiKey);
}

const withKey = (apiKey: string) => ({ "x-api-key": apiKey });

// ---- Looking people up ---------------------------------------------------------------------------------------------------------------

const RATE_LIMIT_RETRIES = 6;
const BETWEEN_LOOKUPS_MS = 100;

/** One person's names from Open Cloud: "found", "missing" (404) or "failed" (anything else, already logged). Waits out rate limits. */
async function lookUpUser(id: number, apiKey: string): Promise<{ found: { username: string; displayName: string } } | "missing" | "failed"> {
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${CLOUD}/users/${id}`, { headers: withKey(apiKey) });
    } catch (err) {
      console.error(`[CloudV2] Error fetching user ${id}:`, err);
      return "failed";
    }
    if (res.ok) {
      const body = await res.json();
      return body.name && body.displayName ? { found: { username: body.name, displayName: body.displayName } } : "failed";
    }
    if (res.status === 404) return "missing";
    if (res.status !== 429) {
      console.warn(`[CloudV2] Failed to fetch user ${id}: ${res.status}`);
      return "failed";
    }
    const wait = 5000 * (attempt + 1);
    console.warn(`[CloudV2] Rate limited on user ${id}, retry ${attempt + 1}/${RATE_LIMIT_RETRIES} after ${wait / 1000}s`);
    await pause(wait);
  }
  return "failed";
}

/** Usernames and display names for many ids, one at a time and gently: Roblox limits how fast a key may ask. */
export async function fetchCloudV2UserInfoBatch(userIds: number[], apiKey: string) {
  const resolved = new Map<number, { username: string; displayName: string }>();
  const notFound: number[] = [];
  for (const [index, id] of userIds.entries()) {
    const result = await lookUpUser(id, apiKey);
    if (typeof result === "object") resolved.set(id, result.found);
    else if (result === "missing") notFound.push(id);
    if (index < userIds.length - 1) await pause(BETWEEN_LOOKUPS_MS);
  }
  return { resolved, notFound };
}

// ---- Group members -------------------------------------------------------------------------------------------------------------------

type Membership = { path?: string; user?: string; role?: string };

const idAfter = (segment: string, path?: string) => {
  const hit = path?.match(new RegExp(`${segment}/(\\d+)`));
  return hit ? parseInt(hit[1], 10) : null;
};

/** The members listed in one page of Open Cloud's answer. `roleId` is used for all of them when the page was filtered to one role. */
export function readMemberships(data: { groupMemberships?: Membership[] }, roleId?: number): GroupMember[] {
  const members: GroupMember[] = [];
  for (const m of data.groupMemberships ?? []) {
    const userId = idAfter("users", m.user);
    if (userId !== null) members.push({ userId, roleId: roleId ?? idAfter("roles", m.role) ?? 0 });
  }
  return members;
}

async function listMemberships(groupId: number, apiKey: string, opts: { filter?: string; roleId?: number; maxPages?: number } = {}): Promise<GroupMember[]> {
  const everyone: GroupMember[] = [];
  let next: string | undefined;
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({ maxPageSize: "100" });
    if (opts.filter) query.set("filter", opts.filter);
    if (next) query.set("pageToken", next);
    const res = await fetch(`${CLOUD}/groups/${groupId}/memberships?${query}`, { headers: withKey(apiKey) });
    if (!res.ok) throw new Error(`Roblox Open Cloud API error (${res.status}): ${await res.text()}`);
    const body = await res.json();
    everyone.push(...readMemberships(body, opts.roleId));
    next = body.nextPageToken;
    if (!next || (opts.maxPages && page >= opts.maxPages)) return everyone;
  }
}

/** Everyone in the group with their role id. `maxPages` stops early, for a quick "does this key work" check. */
export async function fetchOpenCloudGroupMembers(groupId: number, apiKey: string, maxPages = 0): Promise<{ members: GroupMember[] }> {
  return { members: await listMemberships(groupId, apiKey, { maxPages }) };
}

export const fetchOpenCloudRoleMembers = (groupId: number, roleId: number, apiKey: string): Promise<GroupMember[]> =>
  listMemberships(groupId, apiKey, { filter: `role == 'groups/${groupId}/roles/${roleId}'`, roleId });

// ---- Ranking -------------------------------------------------------------------------------------------------------------------------

/** The role one step above or below the current one among the group's ranked roles (the guest role, rank 0, is not on the ladder). */
export function stepRole(roles: Role[], currentRoleId: number, step: 1 | -1): { role?: Role; error?: string } {
  const ladder = roles.filter((r) => r.rank > 0).sort((a, b) => a.rank - b.rank);
  const here = ladder.findIndex((r) => r.id === currentRoleId);
  if (here === -1) return { error: `Current Roblox role ${currentRoleId} was not found in group roles` };
  const target = ladder[here + step];
  if (target) return { role: target };
  return { error: step === 1 ? "User is already at the highest rank" : "User is already at the lowest rank" };
}

const refusal = (error: string): RankingResponse => ({ success: false, error });

/** The words in a failed Open Cloud answer, or a plain description built from its status. */
function failureText(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || `Failed to update role (${status})`;
  } catch {
    return `Failed to update role (${status})`; // not JSON: the status says enough
  }
}

export class RobloxCloudRankingAPI {
  constructor(private apiKey: string, private groupId: number) {}

  private asRoleId(value: string | number): number {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid Roblox role ID: ${value}`);
    return id;
  }

  async setUserRole(userId: number, robloxRoleId: string | number): Promise<RankingResponse> {
    try {
      const roleId = this.asRoleId(robloxRoleId);
      if ((await this.getUserMembership(userId))?.roleId === roleId) return refusal("User is already at this role");

      const res = await fetch(`${CLOUD}/groups/${this.groupId}/memberships/${userId}?updateMask=role`, {
        method: "PATCH",
        headers: { ...withKey(this.apiKey), "Content-Type": "application/json" },
        body: JSON.stringify({ role: `groups/${this.groupId}/roles/${roleId}` }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Roblox API error for user ${userId} -> role ${roleId}: ${body.slice(0, 300)}`);
        return refusal(failureText(res.status, body));
      }
      await pause(1000);
      return { success: true, message: "Role updated successfully" };
    } catch (error: any) {
      console.error("[openCloud] role change threw:", error);
      return refusal(error.message || "Open Cloud ranking request failed");
    }
  }

  /** The group's ranked roles, lowest first. */
  async getGroupRoles(): Promise<Role[]> {
    const res = await fetch(`${GROUPS}/groups/${this.groupId}/roles`);
    if (!res.ok) throw new Error(`Failed to fetch group roles: ${res.status}`);
    const { roles = [] } = await res.json();
    return roles
      .map((r: any) => ({ id: Number(r.id), name: r.name, rank: Number(r.rank) }))
      .filter((r: Role) => Number.isSafeInteger(r.id) && Number.isSafeInteger(r.rank))
      .sort((a: Role, b: Role) => a.rank - b.rank);
  }

  /** The person's current role in this group, or null when they aren't in it. Tries three times: this lookup is flaky. */
  async getUserMembership(userId: number): Promise<{ roleId: number; rank: number } | null> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${GROUPS}/users/${userId}/groups/roles`);
        if (!res.ok) return null;
        const { data = [] } = await res.json();
        const mine = data.find((g: any) => Number(g.group?.id) === this.groupId);
        return mine?.role ? { roleId: Number(mine.role.id), rank: Number(mine.role.rank) } : null;
      } catch {
        if (attempt < 3) await pause(1000);
      }
    }
    return null;
  }

  private async step(userId: number, direction: 1 | -1, failure: string): Promise<RankingResponse> {
    try {
      const [membership, roles] = await Promise.all([this.getUserMembership(userId), this.getGroupRoles()]);
      if (!membership) return refusal("User is not in the group");
      const next = stepRole(roles, membership.roleId, direction);
      return next.role ? this.setUserRole(userId, next.role.id) : refusal(next.error!);
    } catch (error: any) {
      return refusal(error.message || failure);
    }
  }

  promoteUser = (userId: number) => this.step(userId, 1, "Promotion failed");
  demoteUser = (userId: number) => this.step(userId, -1, "Demotion failed");

  /** Moves someone to the lowest ranked role (rank 1). */
  async terminateUser(userId: number): Promise<RankingResponse> {
    try {
      const lowest = (await this.getGroupRoles()).find((r) => r.rank === 1);
      return lowest ? this.setUserRole(userId, lowest.id) : refusal("Could not find lowest rank");
    } catch (error: any) {
      return refusal(error.message || "Termination failed");
    }
  }

  setUserRank = (userId: number, robloxRoleId: string | number) => this.setUserRole(userId, robloxRoleId);
}
