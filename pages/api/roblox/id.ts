import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";

// Looks a Roblox username up (the people pickers use it). Signed-in people only, and the name must be a plain string of a sensible length.

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: true, message: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ error: true, message: "Not logged in" });

  const keyword = typeof req.body?.keyword === "string" ? req.body.keyword.trim() : "";
  if (!keyword || keyword.length > 50) return res.status(400).json({ error: true, message: "Missing or invalid 'keyword'" });

  try {
    const { data } = await axios.post("https://users.roblox.com/v1/usernames/users", { usernames: [keyword], excludeBannedUsers: true }, { timeout: 10_000 });
    return res.status(200).json({ error: false, data: data.data });
  } catch (error: any) {
    const detail = error?.response?.status ? `${error.response.status} - ${error.code ?? "error"}` : "unreachable";
    console.error(`[roblox/id] Username lookup failed: ${detail}`);
    return res.status(500).json({ error: true, message: `Roblox couldn't be reached (${detail})` });
  }
}

export default withSessionRoute(handler);
