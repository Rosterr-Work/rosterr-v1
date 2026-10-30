import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { generateCsrfToken } from "@/utils/csrf";

// The token the site sends back (X-CSRF-Token) on requests that change something. It is tied to the signed-in person.

async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; token?: string; error?: string }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const userId = req.session?.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  try {
    return res.status(200).json({ success: true, token: generateCsrfToken(userId) });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return res.status(500).json({ success: false, error: "Failed to generate CSRF token" });
  }
}

export default withSessionRoute(handler);
