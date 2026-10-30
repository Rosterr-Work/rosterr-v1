const packageJson = require("./package.json");
const { contentSecurityPolicy } = require("./utils/csp");
const { buildRewrites } = require("./utils/hostRewrites");

// Headers every response carries. (X-Frame-Options lets the app frame itself but nobody else frame it.)
const securityHeaders = () =>
  Object.entries({
    "X-DNS-Prefetch-Control": "on",
    "X-XSS-Protection": "0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": contentSecurityPolicy(),
  }).map(([key, value]) => ({ key, value }));

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "tr.rbxcdn.com" }] },
  env: {
    NEXT_PUBLIC_DATABASE_CHECK: process.env.DATABASE_URL ? "true" : "",
    NEXT_PUBLIC_EZ_BUGS_ENABLED: process.env.EZ_BUGS ? "true" : "",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // The API, avatar and webhook addresses (utils/hosts.ts) lead to routes inside the app.
  async rewrites() {
    return { beforeFiles: buildRewrites(process.env), afterFiles: [], fallback: [] };
  },
  // The legal documents moved into the legal centre (pages/legal/). The apps and old emails still link to the old addresses.
  async redirects() {
    return [
      { source: "/terms", destination: "/legal/terms", permanent: true },
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders() },
      // Apple reads this file to decide which links open in the iPhone app (mobile/ios/App/App/App.entitlements, associated-domains).
      { source: "/.well-known/apple-app-site-association", headers: [{ key: "Content-Type", value: "application/json" }] },
    ];
  },
};
