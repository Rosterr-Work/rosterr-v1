import { Head, Html, Main, NextScript } from "next/document";
import { contentSecurityPolicy } from "@/utils/csp";

// Applies the saved (or device) light/dark choice before the page paints, so nobody sees a flash of the wrong one.
const THEME_BOOT =
  "try{var p=localStorage.getItem('theme');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var c=document.documentElement.classList;c.remove('light','dark');c.add(d?'dark':'light')}catch(e){}";

const ICONS: { size?: string; href: string }[] = [
  { href: "/apple-touch-icon.png" },
  { size: "152x152", href: "/apple-touch-icon-152x152.png" },
  { size: "167x167", href: "/apple-touch-icon-167x167.png" },
  { size: "180x180", href: "/apple-touch-icon-180x180.png" },
];

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy({ meta: true })} />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="0" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        {/* Declared outright (not left to the browser guessing /favicon.ico) so password managers such as 1Password, which read the site's own icons, show the Rosterr mark beside saved logins and passkeys. */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rosterr" />
        <meta name="theme-color" content="#0e1a2b" />
        {/* Google AdSense site ownership (utils/ads/rules.ts). */}
        <meta name="google-adsense-account" content="ca-pub-6141672054839241" />
        {ICONS.map((icon) => (
          <link key={icon.href} rel="apple-touch-icon" href={icon.href} {...(icon.size ? { sizes: icon.size } : {})} />
        ))}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
