import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { gameThumbnail } from "@/utils/gameThumbnails";

// The picture for a session type's game, by place id.

type Answer = { success: boolean; thumbnailUrl?: string; error?: string };

export default withPermissionCheck(handler);

async function handler(req: NextApiRequest, res: NextApiResponse<Answer>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const placeId = req.query.placeId;
  if (typeof placeId !== "string" || !/^\d{1,18}$/.test(placeId)) return res.status(400).json({ success: false, error: "Invalid placeId" });

  const found = await gameThumbnail(BigInt(placeId));
  if (!found) return res.status(404).json({ success: false, error: "Thumbnail not found" });
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).json({ success: true, thumbnailUrl: found.imageUrl });
}
