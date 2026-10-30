import { getPlayerThumbnails } from "@/utils/roblox";

/** A person's current headshot on Roblox's servers; the standard headshot address when the lookup has nothing. */
export async function getRemoteAvatarUrl(userId: number): Promise<string> {
  const [thumbnail] = (await getPlayerThumbnails([userId], "180x180")) ?? [];
  return thumbnail?.imageUrl || `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=180&height=180&format=png`;
}
