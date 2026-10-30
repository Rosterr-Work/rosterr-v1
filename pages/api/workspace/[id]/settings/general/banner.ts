import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { loadBanner, readBanner, saveBanner } from "@/utils/settings/home";

export const config = { api: { bodyParser: { sizeLimit: "15mb" } } };

// The image behind the greeting on the home page: GET reads it, PATCH ({ bannerImage }) sets it, or removes it when empty.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  if (!groupId) return res.status(400).json({ success: false, error: "Invalid workspace id." });
  if (req.method === "GET") return res.status(200).json({ success: true, bannerImage: await loadBanner(groupId) });
  if (req.method === "PATCH") {
    const read = readBanner(req.body);
    if (!read.ok) return res.status(400).json({ success: false, error: read.error });
    await saveBanner(groupId, read.value);
    return res.status(200).json({ success: true, bannerImage: read.value });
  }
  return res.status(405).json({ success: false, error: "Method not allowed." });
}, "workspace_customisation");
