import type React from "react";
import "@/styles/tailwind.css";
import "@/styles/globals.scss";
import "@/styles/grid-layout.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { RecoilRoot } from "recoil";
import { SWRConfig } from "swr";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import type { pageWithLayout } from "@/layoutTypes";
import { swrConfig } from "@/lib/swr-config";
import AuthGate from "@/components/app/AuthGate";
import AppEffects from "@/components/app/AppEffects";
import InstanceError from "@/components/app/InstanceError";
import PageSpinner from "@/components/app/PageSpinner";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import AskHost from "@/components/ui/AskHost";
import { ColorThemeHandler, ThemeHandler } from "@/components/app/ThemeHandlers";
import HelpMenu from "@/components/help/HelpMenu";
import IntercomLoader from "@/components/IntercomLoader";

type AppPropsWithLayout = AppProps & { Component: pageWithLayout };

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);
// Charts draw on a canvas, which doesn't inherit the page's font.
ChartJS.defaults.font.family = "'Golos Text', system-ui, sans-serif";

// Module-level so pages without a layout keep a stable component identity across renders.
// Pages with a layout fade in inside it (layouts/*.tsx; they read their child's props, so they can't be wrapped from here). Pages without
// one fade in here. Keyed by the path alone, so changing a filter or tab in the address doesn't replay it.
function NoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return <div key={router.asPath.split(/[?#]/)[0]} className="rr-enter">{children}</div>;
}

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState<string[] | null>(null);
  const Layout = Component.layout || NoLayout;
  // Public marketing pages need no session, so render them straight away instead of behind the sign-in check. That way the server sends
  // real HTML for search engines and link previews.
  const isPublic = (Component as { isPublic?: boolean }).isPublic === true || (pageProps as { signedIn?: boolean }).signedIn === false;

  // Only an explicit "not configured" answer is an error; anything else (a redirect, a 404 from a host that has no API) is not this
  // instance being set up wrongly.
  useEffect(() => {
    fetch("/api/instance-check")
      .then((r) => r.json())
      .then((data) => data?.configured === false && setMissing(data.missing || ["Unknown"]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // A new page starts at the top, unless the link names a section (/legal/privacy#deletion): then Next has already scrolled to it.
    const top = (url: string) => {
      if (!String(url).includes("#")) window.scrollTo(0, 0);
    };
    Router.events.on("routeChangeComplete", top);
    return () => Router.events.off("routeChangeComplete", top);
  }, []);

  if (missing) {
    return (
      <>
        <Head>
          <title>Rosterr - Instance Error</title>
        </Head>
        <InstanceError missing={missing} />
      </>
    );
  }

  return (
    <RecoilRoot>
      <SWRConfig value={swrConfig}>
        <Head>
          <title>Rosterr</title>
        </Head>
        <AuthGate loading={loading} setLoading={setLoading} />
        <AppEffects />
        <IntercomLoader />
        <ThemeHandler />
        <ColorThemeHandler />
        {!loading || isPublic ? (
          <AppErrorBoundary>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </AppErrorBoundary>
        ) : (
          <PageSpinner />
        )}
        {/* After the page, so keyboard users reach the page first; it floats in a corner either way. */}
        <HelpMenu />
        <AskHost />
      </SWRConfig>
    </RecoilRoot>
  );
}
