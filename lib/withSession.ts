import { getIronSession, type SessionOptions } from "iron-session";
import zxcvbn from "zxcvbn";
import type { GetServerSidePropsContext, GetServerSidePropsResult, NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { isUserBlocked, logBlockedAccess } from "@/utils/blocklist";
import { renewSession, SESSION_TTL_SECONDS } from "@/lib/sessionLifetime";
import { trackSession } from "@/utils/sessions/devices";
import { hasLaunchAccess, isExemptApi, isExemptPage, waitlistMode } from "@/utils/waitlist";
import { blockedByReadOnly, validateSupportAccess } from "@/utils/platform/support";
import { refuseVpnApi, refuseVpnPage } from "@/utils/vpn/guard";
import { validateCsrf } from "@/utils/csrf";
import { dedupeSessionCookie } from "@/lib/sessionCookie";
import { isWorkspaceSuspended } from "@/utils/platform/suspension";

// Opens the signed-in session (an encrypted cookie) for API routes and pages, and applies what every request has to: blocked
// accounts, support mode, devices that were signed out, renewing, and the waitlist. The session is then `req.session`.

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error('SESSION_SECRET environment variable is not set. Generate one with "openssl rand -base64 32".');
const strength = zxcvbn(secret).score;
if (strength < 4) {
  throw new Error(`SESSION_SECRET is not strong enough (score ${strength}/4). Generate one with "openssl rand -base64 32" or a password manager.`);
}

const production = process.env.NODE_ENV === "production";
const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "rosterr_session",
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    secure: production,
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    domain: production ? process.env.COOKIE_DOMAIN : undefined,
  },
};

// The session's own fields (userid, platformAccess, …) are declared on iron-session elsewhere; here it's used loosely.
type Session = any;

const deviceOf = (req: { headers: Record<string, any> }) => ({ userAgent: req.headers["user-agent"], country: req.headers["cf-ipcountry"] });

export function withSessionRoute(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // VPNs, proxies and Tor are refused first (when VPN_BLOCK is on), before anything about the visitor is read or recorded.
    if (await refuseVpnApi(req, res)) return;

    const session: Session = await getIronSession(req, dedupeSessionCookie(res, sessionOptions.cookieName), sessionOptions);
    (req as any).session = session;

    if (session.userid && isUserBlocked(session.userid)) {
      logBlockedAccess(session.userid, "active session");
      session.destroy();
      return res.status(401).json({ success: false, error: "Access denied", blocked: true });
    }

    // Support mode (platform staff looking in as someone): ended when it is due, and read-only unless write was granted.
    if (session.platformAccess) {
      const active = await validateSupportAccess(session);
      const access = session.platformAccess;
      if (active && access && blockedByReadOnly(access, req.method, (req.url || "").split("?")[0])) {
        return res.status(403).json({ success: false, error: "support_mode_read_only", message: "Support mode is read-only. Exit support mode to make changes." });
      }
    }

    // Note this device in the person's list, or end the sign-in if they ended it from Settings. Before renewing, which stamps it.
    if ((await trackSession(session, deviceOf(req as any))) === "ended") {
      session.destroy();
      return res.status(401).json({ success: false, error: "You were signed out of this device.", signedOut: true });
    }
    await renewSession(session);

    // While Rosterr is "coming soon", only people who have been let in can use it (staff in support mode are exempt).
    if (session.userid && !session.platformAccess && waitlistMode() && !isExemptApi(req.url) && !(await hasLaunchAccess(session.userid))) {
      return res.status(403).json({ success: false, error: "waitlist", message: "Rosterr isn't open to you yet. Check your application on the waitlist page." });
    }
    // Routes under /api/workspace/<id> that do their own checks (not through the permission wrapper) still get what the wrapper gives: a suspended workspace is locked, and a
    // change made with the cookie has to come from this site.
    const inWorkspace = session.userid ? /^\/api\/workspace\/(\d{1,16})(?:\/|$)/.exec((req.url || "").split("?")[0]) : null;
    if (inWorkspace) {
      const gid = Number(inWorkspace[1]);
      if (session.platformAccess?.groupId !== gid && (await isWorkspaceSuspended(gid))) return res.status(403).json({ success: false, error: "workspace_suspended" });
      if (!validateCsrf(req, res)) return res.status(403).json({ success: false, error: "CSRF validation failed. Invalid origin or referer." });
    }
    return handler(req, res);
  };
}

/** The same checks for a page's getServerSideProps, answered with redirects; compatible with InferGetServerSidePropsType. */
export function withSessionSsr<P extends { [key: string]: unknown } = { [key: string]: unknown }>(
  handler: (context: GetServerSidePropsContext & { req: any }) => GetServerSidePropsResult<P> | Promise<GetServerSidePropsResult<P>>
) {
  return async (context: GetServerSidePropsContext) => {
    const refused = await refuseVpnPage(context.req);
    if (refused) return refused;

    const session: Session = await getIronSession(context.req, dedupeSessionCookie(context.res, sessionOptions.cookieName), sessionOptions);
    (context.req as any).session = session;

    if (session.userid && isUserBlocked(session.userid)) {
      logBlockedAccess(session.userid, "SSR page access");
      session.destroy();
      return { redirect: { destination: "/login?error=access_denied", permanent: false } };
    }
    if (session.platformAccess) await validateSupportAccess(session);

    if ((await trackSession(session, deviceOf(context.req as any))) === "ended") {
      session.destroy();
      return { redirect: { destination: "/login", permanent: false } };
    }
    await renewSession(session);

    if (session.userid && !session.platformAccess && waitlistMode() && !isExemptPage(context.resolvedUrl) && !(await hasLaunchAccess(session.userid))) {
      return { redirect: { destination: "/waitlist", permanent: false } };
    }
    return handler(context as any);
  };
}
