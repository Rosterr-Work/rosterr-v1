import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { robloxRedirectUri } from "@/utils/robloxRedirect";
import { ROBLOX_TOKEN_URL, ROBLOX_USERINFO_URL, type RobloxTokenResponse } from "@/utils/robloxOAuth";
import { getRobloxThumbnail, getRobloxUsername } from "@/utils/roblox";
import { isSuspendedIdentity, reviewEmailMatch } from "@/utils/suspension/record";
import { completeRobloxSignIn, type Dependencies, type RobloxProfile } from "@/utils/auth/robloxCallback";

// Where Roblox sends people back to after "Sign in with Roblox". What happens next is decided in utils/auth/robloxCallback.

const deps: Dependencies = {
  async fetchProfile(code, redirectUri, verifier): Promise<RobloxProfile> {
    const token = await axios.post<RobloxTokenResponse>(
      ROBLOX_TOKEN_URL,
      new URLSearchParams({
        client_id: process.env.ROBLOX_CLIENT_ID ?? "",
        client_secret: process.env.ROBLOX_CLIENT_SECRET ?? "",
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const profile = await axios.get<RobloxProfile>(ROBLOX_USERINFO_URL, { headers: { Authorization: `Bearer ${token.data.access_token}` } });
    return profile.data;
  },
  findUser: (userid) => prisma.user.findUnique({ where: { userid: BigInt(userid) }, select: { banned: true, discordId: true } }),
  isSuspended: (ids) => isSuspendedIdentity(ids),
  reviewEmailMatch: (ids) => reviewEmailMatch(ids),
  async lookUp(userid) {
    const [thumbnail, username] = await Promise.all([getRobloxThumbnail(userid), getRobloxUsername(userid)]);
    return { thumbnail: thumbnail || null, username: username || null };
  },
  async saveLinked(userid, pending, roblox) {
    const fields = {
      username: roblox.username || undefined,
      picture: roblox.thumbnail || undefined,
      registered: true,
      discordId: BigInt(pending.id),
      discordUsername: pending.username,
      discordDisplayName: pending.displayName,
      discordAvatar: pending.avatar,
      discordEmail: pending.email ?? undefined,
    };
    await prisma.user.upsert({ where: { userid: BigInt(userid) }, update: fields, create: { userid: BigInt(userid), ...fields } });
  },
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (req.query.error) console.error("Roblox OAuth error:", req.query.error);

  try {
    const next = await completeRobloxSignIn({
      session: req.session as any,
      query: req.query,
      // Without the app's id and secret there is no redirect address to check against: that is a configuration error, not a failed sign-in.
      redirectUri: process.env.ROBLOX_CLIENT_ID && process.env.ROBLOX_CLIENT_SECRET ? robloxRedirectUri(req.headers.host) : null,
      deps,
    });
    return res.redirect(next);
  } catch (err) {
    console.error("Roblox OAuth callback error:", err);
    if (axios.isAxiosError(err)) console.error("Roblox answered", err.response?.status, err.response?.data);
    return res.redirect("/login?error=oauth_failed");
  }
}
