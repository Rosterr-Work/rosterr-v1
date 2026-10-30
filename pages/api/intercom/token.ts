import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { buildIntercomClaims, INTERCOM_TOKEN_TTL_SECONDS, intercomSecret, legacyUserHash, signIntercomJwt } from "@/utils/intercom";

// Gives the signed-in person's browser what it needs to identify them to Intercom: a short-lived signed token
// (and the older HMAC hash). Optional ?workspace=<id> adds which workspace they are looking at.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.session?.userid) return res.status(401).json({ success: false, error: "Not logged in" });
  // A support agent looking in as someone must not chat to Intercom as them.
  if (req.session.platformAccess) return res.status(403).json({ success: false, error: "Not available in support mode" });

  const secret = intercomSecret();
  if (!secret) return res.status(503).json({ success: false, error: "Intercom is not configured on this server" });

  const raw = typeof req.query.workspace === "string" && /^\d{1,20}$/.test(req.query.workspace) ? req.query.workspace : null;
  try {
    const claims = await buildIntercomClaims(req.session.userid, raw ? BigInt(raw) : null);
    if (!claims) return res.status(403).json({ success: false, error: "Your account has been suspended" });
    return res.status(200).json({
      success: true,
      intercom_user_jwt: signIntercomJwt(claims, secret),
      intercom_user_hash: legacyUserHash(String(claims.user_id), secret),
      expires_in: INTERCOM_TOKEN_TTL_SECONDS,
    });
  } catch (e) {
    console.error("Error creating the Intercom token:", e);
    return res.status(500).json({ success: false, error: "Failed to create the Intercom token" });
  }
}

export default withSessionRoute(handler);
