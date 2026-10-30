import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, setConfig } from "@/utils/configEngine";
import { withPermissionCheck } from "@/utils/permissionsManager";

// The Roblox Studio plugin that sends in-game moderation to this workspace, with the workspace's key and address filled in. The key is
// made the first time it is asked for.

export default withPermissionCheck(handler, "admin");

/** Where the plugin should call back to: the address this request came in on. */
export function originOf(headers: NextApiRequest["headers"]): string | null {
  const proto = String(headers["x-forwarded-proto"] ?? "").split(",")[0].trim() || "http";
  if (proto !== "http" && proto !== "https") return null;
  try {
    return headers.host ? new URL(`${proto}://${headers.host}`).origin : null;
  } catch {
    return null;
  }
}

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  // This hands out (and may create) a long-lived key, which must not outlive a support session.
  if (req.session.platformAccess) return res.status(403).json({ success: false, error: "Not available in support mode" });
  const groupId = parseInt(req.query.id as string);

  const origin = originOf(req.headers);
  if (!origin) return res.status(400).json({ success: false, error: "Couldn't work out the address of this site" });

  let config = await getConfig("moderation", groupId);
  if (!config?.key) {
    // Added to what is stored, not replacing it: moderation being switched on lives in the same value.
    config = { ...(config ?? {}), key: randomBytes(16).toString("hex") };
    await setConfig("moderation", config, groupId);
  }

  const template = readFileSync(join("Rosterr-moderation.rbxmx"), "utf8");
  const plugin = template.replace("<apikey>", config.key).replace("<url>", origin);

  res.setHeader("Content-Disposition", "attachment; filename=Rosterr-moderation.rbxmx");
  res.setHeader("Content-Type", "application/rbxmx");
  return res.status(200).send(plugin as any);
}
