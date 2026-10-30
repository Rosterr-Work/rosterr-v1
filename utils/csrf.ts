import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { trustedEdgeHost } from "@/utils/requestHost";

// Cross-site request protection. A request that changes something must come from one of our own pages: its Origin (or Referer) has to be
// this site, or one of the addresses listed in NEXTAUTH_URL / ALLOWED_ORIGINS. A few routes also ask for a signed, short-lived token.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

const allowedOrigins = (): string[] => [process.env.NEXTAUTH_URL, ...(process.env.ALLOWED_ORIGINS ?? "").split(",")].map((o) => o?.trim()).filter((o): o is string => Boolean(o));

const hostOf = (value: string): string | null => {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
};

export function validateOrigin(req: NextApiRequest): boolean {
  const header = (name: string) => req.headers[name] as string | undefined;
  const origin = header("origin");
  const referer = header("referer");
  // On a workspace's own domain the real host comes from our edge Worker (utils/requestHost.ts), not the Host header.
  const host = trustedEdgeHost((n) => header(n)) || header("x-forwarded-host") || header("host");

  if (process.env.NODE_ENV === "development" && (host?.includes("localhost") || host?.includes("127.0.0.1"))) return true;

  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) return true;
  if (origin && host) {
    const protocol = header("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
    if (origin === `${protocol}://${host}`) return true;
  }

  if (referer) {
    const url = (() => {
      try {
        return new URL(referer);
      } catch {
        return null;
      }
    })();
    if (!url) return false;
    if (allowed.includes(`${url.protocol}//${url.host}`)) return true;
    if (host && url.host === host) return true;
  }

  // With a list of allowed origins, nothing else is let through.
  if (allowed.length > 0) return false;

  // Otherwise the page's own host is what the origin or referer must match.
  if (host && origin) return hostOf(origin) === host;
  if (host && referer) return hostOf(referer) === host;

  console.warn("[CSRF] Request missing origin, referer, and host headers");
  return false;
}

/** Whether a request may go ahead: reads always may, anything that changes something has to come from one of our own pages. */
export function validateCsrf(req: NextApiRequest, _res?: NextApiResponse): boolean {
  const method = req.method?.toUpperCase();
  if (!method || SAFE_METHODS.has(method)) return true;
  if (validateOrigin(req)) return true;
  console.error("[CSRF] Origin/Referer validation failed", { method: req.method, url: req.url, origin: req.headers.origin, referer: req.headers.referer, host: req.headers.host });
  return false;
}

const secret = () => process.env.SESSION_SECRET || process.env.SECRET_KEY;
const sign = (key: string, sessionId: string | number, at: number) => crypto.createHmac("sha256", key).update(`${sessionId}:${at}`).digest("hex");

export function generateCsrfToken(sessionId: string | number): string {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET or SECRET_KEY must be configured for CSRF token generation");
  const at = Date.now();
  return `${sign(key, sessionId, at)}:${at}`;
}

export function validateCsrfToken(token: string, sessionId: string | number, maxAge: number = TOKEN_LIFETIME_MS): boolean {
  if (!token || typeof token !== "string") return false;
  const [hash, stamp, ...rest] = token.split(":");
  const at = Number(stamp);
  const key = secret();
  if (rest.length > 0 || !hash || !key || !Number.isInteger(at) || Date.now() - at > maxAge || at > Date.now() + 60_000) return false;
  const expected = Buffer.from(sign(key, sessionId, at));
  const given = Buffer.from(hash);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
