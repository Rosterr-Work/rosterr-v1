import crypto from "crypto";
import rateLimit from "express-rate-limit";
import type { NextApiRequest, NextApiResponse, NextApiHandler } from "next";
import { endpointOf, runWithApiCall } from "@/utils/apiContext";

const WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MESSAGE = { success: false, error: "Rate limit exceeded. Please try again later." };

function workspaceOf(req: any): string {
  // Anything that is not a plain number shares one bucket, so an unlimited supply of made-up ids cannot each get a fresh allowance (or fill the memory).
  const id = req.url?.match(/\/workspace\/([^/?]+)/)?.[1];
  return id && /^\d{1,16}$/.test(id) ? id : "other";
}

function bearerOf(req: any): string {
  return req.headers?.authorization?.replace("Bearer ", "") || "";
}

// NOTE: these headers are only trustworthy behind a proxy that overwrites them
// (e.g. Cloudflare sets cf-connecting-ip). Deploy behind one, or the per-IP
// limit can be dodged by spoofing.
function clientIp(req: any): string {
  const cfIp = req.headers?.["cf-connecting-ip"];
  const xRealIp = req.headers?.["x-real-ip"];
  const forwarded = req.headers?.["x-forwarded-for"];
  const remoteAddress = req.socket?.remoteAddress;
  return cfIp || xRealIp || forwarded?.split(",")[0]?.trim() || remoteAddress || "unknown";
}

type Limits = { ipMax: number; keyMax: number };

// Public REST API (/api/public/v1): strict, meant for a handful of server scripts.
export const PUBLIC_API_LIMITS: Limits = { ipMax: 1000, keyMax: 200 };

// Legacy in-game activity endpoints (/api/activity/*): the bundled Roblox packages
// call these on every join/leave from every server, so allow much more traffic.
export const ACTIVITY_API_LIMITS: Limits = { ipMax: 6000, keyMax: 6000 };

function buildLimiters({ ipMax, keyMax }: Limits) {
  // First line of defence: keyed by client IP, so an attacker can't get a fresh
  // budget (and force a database lookup) by sending a different bogus API key on
  // every request.
  const ip = rateLimit({
    windowMs: WINDOW_MS,
    max: ipMax,
    message: RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `ip:${clientIp(req)}:workspace:${workspaceOf(req)}`,
  });

  // Second line: per API key. The key is hashed so the plaintext never sits in
  // the limiter's in-memory store.
  const key = rateLimit({
    windowMs: WINDOW_MS,
    max: keyMax,
    message: RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const apiKey = bearerOf(req);
      if (!apiKey) return `ip:${clientIp(req)}:workspace:${workspaceOf(req)}`;
      const digest = crypto.createHash("sha256").update(apiKey).digest("hex");
      return `apikey:${digest}:workspace:${workspaceOf(req)}`;
    },
  });

  return { ip, key };
}

type Limiter = ReturnType<typeof rateLimit>;

// Resolves true if the request may proceed, false if the limiter already
// answered it (429), so we never leave a promise dangling on a rejected request.
function passes(limiter: Limiter, req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  return new Promise((resolve, reject) => {
    res.once("finish", () => resolve(false));
    limiter(req as any, res as any, (err?: unknown) => (err ? reject(err) : resolve(true)));
  });
}

export function withRateLimit(handler: NextApiHandler, limits: Limits): NextApiHandler {
  const limiters = buildLimiters(limits);
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      if (!(await passes(limiters.ip, req, res))) return;
      if (!(await passes(limiters.key, req, res))) return;
    } catch {
      return res.status(429).json(RATE_LIMIT_MESSAGE);
    }
    // Anything below that checks an API key can say where the call came from (Settings v1.10).
    return runWithApiCall({ ip: clientIp(req).slice(0, 100), path: endpointOf(req.url) }, () => handler(req, res));
  };
}

export function withPublicApiRateLimit(handler: NextApiHandler): NextApiHandler {
  return withRateLimit(handler, PUBLIC_API_LIMITS);
}

export function withActivityApiRateLimit(handler: NextApiHandler): NextApiHandler {
  return withRateLimit(handler, ACTIVITY_API_LIMITS);
}
