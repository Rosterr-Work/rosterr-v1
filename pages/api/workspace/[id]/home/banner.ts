import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";

// The home page's banner picture. It is stored in the workspace's home settings as an inline image, so only that is handed out.

export default withPermissionCheck(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false });
  const home = await getConfig("home", parseInt(req.query.id as string, 10));
  const image = home?.bannerImage;
  return res.status(200).json({ bannerImage: typeof image === "string" && image.startsWith("data:") ? image : null });
}
