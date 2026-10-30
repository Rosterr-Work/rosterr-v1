import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";

// Signing out: forgets the session cookie. (POST, so a link or an image tag can't sign someone out.)

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  req.session.destroy();
  return res.status(200).json({ success: true });
}
