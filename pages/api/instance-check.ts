import type { NextApiRequest, NextApiResponse } from "next";

// A health check that needs no sign-in: says whether the settings the app can't run without are present. The setup pages and uptime
// monitors read it.

const REQUIRED = ["ENCRYPTION_KEY"];

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) return res.status(503).json({ configured: false, missing });
  return res.status(200).json({ configured: true });
}
