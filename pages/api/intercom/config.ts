import type { NextApiRequest, NextApiResponse } from "next";
import { intercomSecret } from "@/utils/intercom";

// Whether Intercom is switched on for this server, and how people are identified to it.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ configured: Boolean(intercomSecret()), security: process.env.INTERCOM_SECURITY === "hmac" ? "hmac" : "jwt" });
}
