import axios from "axios";
import { readRankingToken, readRobloxKey } from "@/utils/externalCredentials";

// The ranking services a workspace can use to move people between group ranks: RankGun (an outside service with its own token) or Roblox
// directly (Open Cloud). A workspace picks one in Settings > Roblox & ranking; this gives the rest of the app one shape for both.

export interface RankGunResponse { success: boolean; message?: string; error?: string }
interface RankGun { apiKey: string; workspaceId: string }

const BASE = "https://api.rankgun.works";

const CODE_WORDS: Record<string, string> = { PERMISSION_DENIED: "Insufficient permissions", USER_NOT_FOUND: "User not found", WORKSPACE_NOT_FOUND: "Workspace not found" };

/** The words for an error RankGun answered with. */
export function explainRankGunError(error: { response?: { data?: any }; message?: string }): string {
  const data = error.response?.data;
  if (data) {
    if (data.message) return data.message;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    if (data.code) return CODE_WORDS[data.code] ?? `Error: ${data.code}`;
  }
  return error.message || "RankGun API request failed";
}

export class RankGunAPI {
  constructor(private config: RankGun) {}

  private async post(path: string, body: Record<string, unknown>): Promise<RankGunResponse> {
    try {
      const r = await axios.post(`${BASE}${path}`, { ...body, workspace_id: this.config.workspaceId }, { headers: { "api-token": this.config.apiKey, "Content-Type": "application/json" }, timeout: 15_000 });
      return { success: true, message: r.data?.message || "Operation completed successfully" };
    } catch (error: any) {
      return { success: false, error: explainRankGunError(error) };
    }
  }

  promoteUser(userId: number) {
    return this.post("/roblox/promote", { user_id: userId });
  }
  demoteUser(userId: number) {
    return this.post("/roblox/demote", { user_id: userId });
  }
  terminateUser(userId: number) {
    return this.post("/roblox/set-rank", { user_id: userId, rank: 1 });
  }
  setUserRank(userId: number, rank: number) {
    return this.post("/roblox/set-rank", { user_id: userId, rank });
  }
}

export async function getRankGun(workspaceGroupId: bigint | number): Promise<RankGun | null> {
  try {
    const { default: prisma } = await import("@/utils/database");
    const s = await prisma.externalConnection.findFirst({ where: { workspaceGroupId, rankingProvider: "rankgun" } });
    const apiKey = readRankingToken(s?.rankingToken);
    return apiKey && s?.rankingWorkspaceId ? { apiKey, workspaceId: String(s.rankingWorkspaceId) } : null;
  } catch {
    return null;
  }
}

type Outcome = Promise<RankGunResponse>;

export interface RankingProvider {
  setUserRank(userId: number, rankOrRoleId: number): Outcome;
  terminateUser(userId: number): Outcome;
  demoteUser(userId: number): Outcome;
  promoteUser(userId: number): Outcome;
  type: "rankgun" | "roblox_cloud";
}

/** RankGun ranks by rank number; a Roblox role id (above 255) is turned into its rank number first. */
function rankGunProvider(config: RankGun, groupId: number): RankingProvider {
  const api = new RankGunAPI(config);
  return {
    type: "rankgun",
    promoteUser: (id) => api.promoteUser(id),
    demoteUser: (id) => api.demoteUser(id),
    terminateUser: (id) => api.terminateUser(id),
    async setUserRank(userId, roleId) {
      if (roleId <= 255) return api.setUserRank(userId, roleId);
      const { getGroupRoles } = await import("@/utils/roblox");
      const role = (await getGroupRoles(groupId)).find((r) => r.id === roleId);
      return role ? api.setUserRank(userId, role.rank) : { success: false, error: `No role found with ID ${roleId}` };
    },
  };
}

export async function getRankingProvider(workspaceGroupId: bigint | number): Promise<RankingProvider | null> {
  try {
    const { default: prisma } = await import("@/utils/database");
    const s = await prisma.externalConnection.findFirst({ where: { workspaceGroupId } });
    if (!s?.rankingProvider) return null;

    if (s.rankingProvider === "rankgun") {
      const token = readRankingToken(s.rankingToken);
      return token && s.rankingWorkspaceId ? rankGunProvider({ apiKey: token, workspaceId: String(s.rankingWorkspaceId) }, Number(workspaceGroupId)) : null;
    }
    if (s.rankingProvider === "roblox_cloud") {
      const key = readRobloxKey(s.robloxApiKey);
      if (!key) return null;
      const { RobloxCloudRankingAPI } = await import("@/utils/openCloud");
      const api = new RobloxCloudRankingAPI(key, Number(workspaceGroupId));
      return {
        type: "roblox_cloud",
        promoteUser: (id) => api.promoteUser(id),
        demoteUser: (id) => api.demoteUser(id),
        terminateUser: (id) => api.terminateUser(id),
        setUserRank: (id, role) => api.setUserRank(id, role),
      };
    }
    return null;
  } catch {
    return null;
  }
}
