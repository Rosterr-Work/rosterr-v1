import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/utils/csp";
import { decide, hostConfig, mayBeCustomHost, roleOf, type HostRole } from "@/utils/hosts";
import { lookupCustomHost } from "@/utils/customHostLookup";
import { EDGE_HOST_HEADER, EDGE_KEY_HEADER, trustedEdgeHost } from "@/utils/requestHost";

const BASE_PAGE_HEADERS: [string, string][] = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["X-XSS-Protection", "0"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
];

// Security headers for pages (the marketing site, the app, and any host not set up as one of the split addresses).
function pageHeaders(response: NextResponse, custom = false) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy());

  for (const [name, value] of BASE_PAGE_HEADERS) response.headers.set(name, value);

  // The phone app scans the sign-in QR code with the camera. It starts on "/" and moves to "/login" without reloading,
  // and a browser keeps the policy of the page it first loaded, so this has to allow the camera on every page rather
  // than just /login. "(self)" still refuses it to anyone else's frames.
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");

  // A workspace's own domain belongs to its owner, not to us: no includeSubDomains, and never preload.
  response.headers.set("Strict-Transport-Security", custom ? "max-age=31536000" : "max-age=63072000; includeSubDomains; preload");
  return response;
}

// The API, avatar and webhook addresses serve data, never pages: nothing on them may be framed, scripted or sniffed.
function dataHeaders(response: NextResponse, role: HostRole) {
  response.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Robots-Tag", "noindex");
  if (role === "api" || role === "avatar") {
    // Anyone may read these from a browser page; the API still needs its key, and avatars are public pictures.
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  }
  return response;
}

const cfg = hostConfig();

// Set here, for the app to read, on a workspace's own domain only. Whatever a visitor sends under this name is thrown away.
const CUSTOM_GROUP_HEADER = "x-rosterr-custom-group";

export default async function proxy(request: NextRequest) {
  // The same header Next itself uses to pick the rewrites for the API, avatar and webhook addresses, so the two always agree.
  // Through the Worker for a workspace's own domain, the real host is in a header only the Worker can set.
  const edgeHost = trustedEdgeHost((n) => request.headers.get(n));
  const host = edgeHost ?? request.headers.get("host");
  let role: HostRole = roleOf(host, cfg);
  const { pathname, search } = request.nextUrl;

  let customGroupId: string | undefined;
  let customPaused = false;
  let customBlocked = false;
  if (role === "legacy" && host && mayBeCustomHost(host, cfg)) {
    const found = await lookupCustomHost(host);
    // Can't tell whether this is a workspace's own domain: refuse rather than show it everything.
    if (found === undefined) return pageHeaders(new NextResponse(JSON.stringify({ success: false, error: "Try again in a moment" }), { status: 503, headers: { "content-type": "application/json", "cache-control": "no-store" } }));
    if (found) {
      role = "custom";
      customGroupId = found.groupId;
      customPaused = found.paused;
      customBlocked = found.blocked;
    }
  }

  // The Worker forwards workspace domains and nothing else. A domain it forwards that isn't (or is no longer) a workspace's own
  // would otherwise be treated as an unknown host and get the whole app.
  if (edgeHost && role !== "custom") return pageHeaders(new NextResponse(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: { "content-type": "application/json", "cache-control": "no-store" } }));

  const decision = decide({ role, host, pathname, search, method: request.method, customGroupId, customPaused, customBlocked }, cfg);
  const isCustom = role === "custom";

  if (decision.type === "redirect") return isCustom ? pageHeaders(NextResponse.redirect(decision.to, decision.status), true) : NextResponse.redirect(decision.to, decision.status);

  // A suspended workspace domain: our own page, under the visitor's address. It sets its own status (402) and is never cached.
  if (decision.type === "rewrite") {
    const res = NextResponse.rewrite(new URL(decision.to, request.url));
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex");
    return pageHeaders(res, true);
  }

  if (decision.type === "deny") {
    const res = new NextResponse(JSON.stringify({ success: false, error: decision.message }), { status: decision.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
    return role === "api" || role === "avatar" || role === "hooks" ? dataHeaders(res, role) : pageHeaders(res, isCustom);
  }

  if (decision.type === "preflight") {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.headers.set("Access-Control-Max-Age", "86400");
    return dataHeaders(res, role);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CUSTOM_GROUP_HEADER);
  if (!edgeHost) {
    // Never pass on a claim that couldn't be proved.
    requestHeaders.delete(EDGE_HOST_HEADER);
    requestHeaders.delete(EDGE_KEY_HEADER);
  }
  if (customGroupId) requestHeaders.set(CUSTOM_GROUP_HEADER, customGroupId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return role === "api" || role === "avatar" || role === "hooks" ? dataHeaders(response, role) : pageHeaders(response, isCustom);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
