import NodeCache from "node-cache";
import { getRobloxDisplayName, getRobloxUsername } from "@/utils/roblox";

// Roblox names, remembered for a while so a page of people doesn't make a page of requests.

export const UNKNOWN_USER = "Unknown User";

const usernames = new NodeCache();
const displayNames = new NodeCache();

/** Remembers a name unless Roblox couldn't be reached: "Unknown User" would stick until a restart and show everyone that way. */
async function cached(store: NodeCache, userId: number | bigint, fetchName: (id: number) => Promise<string>): Promise<string> {
  const id = Number(userId);
  const hit = store.get<string>(id);
  if (hit) return hit;
  const name = await fetchName(id);
  if (name !== UNKNOWN_USER) store.set(id, name);
  return name;
}

export const getUsername = (userId: number | bigint) => cached(usernames, userId, getRobloxUsername);
export const getDisplayName = (userId: number | bigint) => cached(displayNames, userId, getRobloxDisplayName);
export const getThumbnail = (userId: number | bigint): string => `/api/workspace/[id]/avatar/${userId}`;

export { getRobloxUsername };
