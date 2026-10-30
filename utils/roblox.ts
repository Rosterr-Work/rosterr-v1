import { fetchApi, isAnyErrorResponse } from "rozod";
import { getUsersUserid, postUsernamesUsers } from "rozod/endpoints/usersv1";
import { getGroupsIcons, getUsersAvatarHeadshot } from "rozod/endpoints/thumbnailsv1";
import { getGroupsGroupid, getGroupsGroupidRoles, getUsersUseridGroupsRoles } from "rozod/endpoints/groupsv1";
import { getGames } from "rozod/endpoints/gamesv1";
import { getGroupsGroupidGames } from "rozod/endpoints/gamesv2";

// Asking Roblox for public things: people, pictures, groups and their roles, experiences. Every lookup answers with a plain blank when
// Roblox is slow or failing, so a Roblox outage never takes one of our pages down with it.

export type RobloxRole = { id: number; name: string; rank: number; description: string; memberCount: number };

/** The rank (out of 255) someone needs in a Roblox group to turn it into a workspace, by themselves or through an approved waitlist
 * application: an officer rank or above, not just any member. */
export const MIN_OWNER_RANK = 25;

const GIVE_UP_AFTER_MS = 12_000;
const UNKNOWN = "Unknown User";

function withinTime<T>(work: Promise<T>, ms = GIVE_UP_AFTER_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** Runs a lookup; on any failure logs what was being asked for and returns the blank instead. */
async function orBlank<T>(what: string, blank: T, lookup: () => Promise<T>): Promise<T> {
  try {
    return await lookup();
  } catch (error) {
    console.error(`Error getting ${what}:`, error);
    return blank;
  }
}

const userRecord = (id: number | bigint) => withinTime(fetchApi(getUsersUserid, { userId: Number(id) }, { throwOnError: true }));

// ---- People --------------------------------------------------------------------------------------------------------------------------

export const getRobloxUsername = (id: number | bigint) => orBlank(`username for user ${id}`, UNKNOWN, async () => (await userRecord(id)).name);

export async function getRobloxUser(id: number | bigint): Promise<{ name: string; displayName: string } | null> {
  try {
    const u = await userRecord(id);
    return u?.name ? { name: u.name, displayName: u.displayName ?? u.name } : null;
  } catch {
    return null;
  }
}

export async function getRobloxDisplayName(id: number | bigint): Promise<string> {
  try {
    return (await userRecord(id)).displayName || UNKNOWN;
  } catch (error) {
    console.error(`[roblox] display name lookup failed for ${id}:`, error);
    return getRobloxUsername(id);
  }
}

export const getRobloxBlurb = (userId: number) =>
  orBlank<string | null>(`blurb for user ${userId}`, null, async () => (await fetchApi(getUsersUserid, { userId }, { throwOnError: true })).description ?? null);

/** The id for a username. Unlike the other lookups this throws when there is no such person. */
export async function getRobloxUserId(username: string, _origin?: string): Promise<number> {
  try {
    const found = await withinTime(fetchApi(postUsernamesUsers, { body: { usernames: [username], excludeBannedUsers: false } }, { throwOnError: true }));
    const id = found.data?.[0]?.id;
    if (!id) throw new Error(`User not found: ${username}`);
    return id;
  } catch (error) {
    console.error(`[roblox] id lookup failed for ${username}:`, error);
    throw error;
  }
}

// ---- Pictures ------------------------------------------------------------------------------------------------------------------------

type Thumbnail = { targetId?: number; state?: string; imageUrl?: string; version?: string };
type ThumbnailResponse = { data?: Thumbnail[] };

const asThumbnails = (answer: unknown) => (answer as ThumbnailResponse).data ?? [];

export const getPlayerThumbnails = (userIds: number[], size: "180x180" | "720x720" = "180x180") =>
  orBlank<Thumbnail[]>("player thumbnails", [], async () => asThumbnails(await fetchApi(getUsersAvatarHeadshot, { userIds, size, format: "Png" })));

export const getRobloxThumbnail = (id: number | bigint) =>
  orBlank(`thumbnail for user ${id}`, "", async () => asThumbnails(await withinTime(fetchApi(getUsersAvatarHeadshot, { userIds: [Number(id)], size: "720x720", format: "Png" })))[0]?.imageUrl ?? "");

/** Where Roblox serves a person's headshot from right now (a link that expires), with Roblox's own redirecting address as a fallback. */
export async function headshotAddress(userId: number): Promise<string> {
  const [thumb] = await getPlayerThumbnails([userId], "180x180");
  return thumb?.imageUrl || `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=180&height=180&format=png`;
}

// ---- Groups --------------------------------------------------------------------------------------------------------------------------

export const getGroupLogo = (groupId: number) =>
  orBlank(`logo for group ${groupId}`, "", async () => asThumbnails(await fetchApi(getGroupsIcons, { groupIds: [groupId], size: "150x150", format: "Png" }))[0]?.imageUrl ?? "");

export const getGroupInfo = (groupId: number) => fetchApi(getGroupsGroupid, { groupId }, { throwOnError: true });

export const getGroupRoles = (groupId: number) =>
  orBlank<RobloxRole[]>(`roles for group ${groupId}`, [], async () => ((await fetchApi(getGroupsGroupidRoles, { groupId }, { throwOnError: true })).roles ?? []) as RobloxRole[]);

export async function getGroupRole(groupId: number, rank: number | null): Promise<RobloxRole | null> {
  if (rank === null) return null;
  return (await getGroupRoles(groupId)).find((r) => r.rank === rank) ?? null;
}

/** The person's rank (0 to 255) in the group, or null when they are not in it or Roblox did not answer. */
export const getRankInGroup = (groupId: number, userId: number) =>
  orBlank<number | null>(`rank for user ${userId} in group ${groupId}`, null, async () => {
    const answer = await fetchApi(getUsersUseridGroupsRoles, { userId });
    if (isAnyErrorResponse(answer)) return null;
    return answer.data?.find((g: any) => g.group?.id === groupId)?.role?.rank ?? null;
  });

/**
 * Like getRankInGroup, but says whether Roblox actually answered. `known: false` means the lookup failed, which is not the same as the
 * person not being in the group (rank null with `known: true`).
 */
export async function lookupRankInGroup(groupId: number, userId: number): Promise<{ known: boolean; rank: number | null }> {
  try {
    const answer = await fetchApi(getUsersUseridGroupsRoles, { userId });
    if (isAnyErrorResponse(answer)) return { known: false, rank: null };
    return { known: true, rank: answer.data?.find((g: any) => g.group?.id === groupId)?.role?.rank ?? null };
  } catch (error) {
    console.error(`[roblox] rank lookup failed for ${userId} in group ${groupId}:`, error);
    return { known: false, rank: null };
  }
}

// ---- Experiences ---------------------------------------------------------------------------------------------------------------------

/** A plain JSON GET to a public Roblox address; null when it fails, times out or isn't OK. */
async function publicJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * The experience (universe) a place belongs to, with its name, from Roblox's open place-to-universe lookup and the games lookup. Modules
 * downloaded before an earlier fix sent the experience's own (universe) id by mistake, so an id that isn't a place is tried as a universe.
 */
export async function getUniverseFromPlaceId(id: number): Promise<{ universeId: number; name: string } | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const place = await publicJson(`https://apis.roblox.com/universes/v1/places/${id}/universe`);
  const universeId = Number(place?.universeId) > 0 ? Number(place.universeId) : id;
  const games = await publicJson(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
  const game = Array.isArray(games?.data) ? games.data.find((g: any) => Number(g?.id) === universeId) : null;
  return game ? { universeId, name: String(game.name ?? `Experience ${universeId}`) } : null;
}

export const fetchUniverseInfo = (universeId: number) =>
  orBlank<any[]>(`universe info for ${universeId}`, [], async () => {
    const answer = await fetchApi(getGames, { universeIds: [universeId] });
    return isAnyErrorResponse(answer) ? [] : answer.data ?? [];
  });

/** The group's experiences with their details (name, playing, visits), looked up fifty at a time. */
export const fetchGroupGames = (groupId: number) =>
  orBlank<any[]>(`games for group ${groupId}`, [], async () => {
    const listed = await fetchApi(getGroupsGroupidGames, { groupId, limit: 100 });
    if (isAnyErrorResponse(listed)) return [];
    const universeIds: number[] = (listed.data ?? []).map((g: any) => g.id);
    const details: any[] = [];
    for (let from = 0; from < universeIds.length; from += 50) {
      const batch = await fetchApi(getGames, { universeIds: universeIds.slice(from, from + 50) });
      if (!isAnyErrorResponse(batch)) details.push(...(batch.data ?? []));
    }
    return details;
  });
