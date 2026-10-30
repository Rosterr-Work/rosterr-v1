import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { fetchOpenCloudGroupMembers } from "@/utils/openCloud";

// "Test this key": tries an Open Cloud API key against a group (reading one member) and says in plain words whether it works. Only for
// signed-in people, since otherwise this would be a free way to try Roblox keys through our server.

/** What an Open Cloud failure means for the person, from the error's text. */
export function explainKeyFailure(message: string | undefined): string {
  const text = message ?? "";
  if (text.includes("403")) return "API key lacks permission to read this group's members. Make sure the Group API system is added with Read access for your group.";
  if (text.includes("401") || text.includes("Invalid API Key")) return "Invalid API key. Please check the key and try again.";
  if (text.includes("IP")) return "Your server's IP is not in the API key's allowed IPs.";
  return "API key is invalid or lacks the required permissions.";
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ valid: false, message: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ valid: false, message: "Not logged in" });

  const { apiKey, groupId } = req.body ?? {};
  if (typeof apiKey !== "string" || !apiKey.trim()) return res.status(400).json({ valid: false, message: "API key is required" });
  if (!groupId || isNaN(Number(groupId))) return res.status(400).json({ valid: false, message: "Valid group ID is required" });

  try {
    const found = await fetchOpenCloudGroupMembers(Number(groupId), apiKey, 1);
    return res.status(200).json({ valid: true, memberCount: found.members.length, message: "Connected. The API key is valid for this group." });
  } catch (error: any) {
    console.error("[test-roblox-key] Validation failed:", error?.message);
    return res.status(200).json({ valid: false, message: explainKeyFailure(error?.message) });
  }
}

export default withSessionRoute(handler);
