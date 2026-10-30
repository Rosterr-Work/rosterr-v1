import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { phoneWall } from "@/utils/wall/phones";

// The Wall for the phone apps: the newest posts, pinned first, without pictures. (The website reads wall/feed.)
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const posts = await phoneWall(parseInt(req.query.id as string, 10), req.session.userid as number);
  return res.status(200).json({ success: true, posts });
}, "view_wall");
