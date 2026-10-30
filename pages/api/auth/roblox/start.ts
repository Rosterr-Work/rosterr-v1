import { randomBytes } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { safeNext } from "@/utils/safeNext";
import { robloxRedirectUri } from "@/utils/robloxRedirect";
import { generatePkce, robloxOAuthConfigured, ROBLOX_AUTHORIZE_URL } from "@/utils/robloxOAuth";

// Begins "Sign in with Roblox": remembers a one-time state and PKCE verifier in the session, then sends the browser to Roblox.
// utils/auth/robloxCallback.ts finishes it when Roblox sends them back.

export default withSessionRoute(handler);

const IN_THE_APPS = /Rosterr(App|Desktop)/i;

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (req.session.userid) return res.redirect("/");

  // The phone and desktop apps never do OAuth themselves (same as Discord).
  if (IN_THE_APPS.test(req.headers["user-agent"] ?? "")) return res.redirect("/login?error=app_no_discord");
  if (!robloxOAuthConfigured()) return res.redirect("/login?error=roblox_unavailable");

  const redirectUri = robloxRedirectUri(req.headers.host);
  if (!redirectUri) {
    console.error("Missing Roblox OAuth redirect URI configuration");
    return res.status(500).json({ error: "OAuth configuration error" });
  }

  const state = randomBytes(24).toString("base64url");
  const { verifier, challenge } = generatePkce();
  req.session.oauthState = state;
  req.session.robloxCodeVerifier = verifier;
  // Where to go once signed in, if the page that sent them here said so (only ever a path on this site).
  const next = safeNext(req.query.next);
  if (next) req.session.returnTo = next;
  else delete req.session.returnTo;
  await req.session.save();

  const url = new URL(ROBLOX_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: process.env.ROBLOX_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: "openid profile",
    response_type: "code",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return res.redirect(url.toString());
}
