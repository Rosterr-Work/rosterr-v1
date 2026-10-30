import type { NextApiRequest, NextApiResponse } from "next";
import { headshotAddress } from "@/utils/roblox";
import { parseId, serveCachedImage } from "@/utils/imageCache";

// A person's Roblox headshot, served from our own address. Public, no sign-in. Also the target of the avatar address
// (see utils/hosts.ts), where it is /<userId>.png.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end("Method not allowed");
  const id = parseId(req.query.userid);
  if (!id) return res.status(400).end("Invalid userId");
  await serveCachedImage(req, res, "user", id, headshotAddress);
}
