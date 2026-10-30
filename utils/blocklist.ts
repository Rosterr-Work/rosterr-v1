// Roblox accounts that are not allowed in at all: a comma-separated list of user ids in ROBLOX_BLOCKLIST. Read on each check, so a
// change to the environment applies without a rebuild.

function blockedIds(): Set<string> {
  return new Set((process.env.ROBLOX_BLOCKLIST ?? "").split(",").map((id) => id.trim()).filter(Boolean));
}

export const isUserBlocked = (userId: string | number | bigint): boolean => blockedIds().has(String(userId));

export const getBlockedUserIdsList = (): string[] => [...blockedIds()];

export function logBlockedAccess(userId: string | number | bigint, context: string = "login"): void {
  console.warn(`[BLOCKLIST] Blocked access attempt by user ID ${userId} during ${context}`);
}
