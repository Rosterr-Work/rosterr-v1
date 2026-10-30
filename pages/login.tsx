import { NextPage } from "next";
import ProviderLogo from "@/components/brand/ProviderLogo";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import StepPattern from "@/components/brand/StepPattern";
import toast from "react-hot-toast";
import { RosterrWordmark } from "@/components/brand/RosterrMark";
import { focusRing } from "@/components/marketing/Chrome";
import AppSignIn from "@/components/AppSignIn";
import { isNativeApp } from "@/utils/nativeApp";
import { applyGroupTheme } from "@/utils/theme";
import { shownSeason } from "@/utils/seasonClient";
import type { SeasonInfo } from "@/utils/seasons";
import { loginProblem } from "@/utils/auth/loginErrors";

const Login: NextPage = () => {
  const router = useRouter();

  const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  // Set when someone presses a sign-in button without ticking the box: the box then says so, and takes focus.
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const confirmBox = useRef<HTMLInputElement>(null);

  // The phone app signs in with a code from the website instead of Discord.
  const [inApp, setInApp] = useState(false);
  // Off until ROBLOX_CLIENT_ID/SECRET are set on the server (see utils/robloxOAuth.ts) — stays hidden
  // until Roblox approves the OAuth app and the real values are configured.
  const [robloxAvailable, setRobloxAvailable] = useState(false);
  // True only on the local development server with a demo user set up (see pages/api/auth/dev-login.ts).
  const [devLogin, setDevLogin] = useState(false);
  // Set only on a workspace's own domain (Business): whose it is and how it looks. Signing in there happens at the app
  // address and comes straight back (see docs/custom-domains.md), so there is one button instead of two.
  const [branding, setBranding] = useState<{ name: string | null; logo: string | null; theme: string | null; whiteLabel: boolean } | null>(null);

  // Set from mid October to 1 November once the seasonal release is for everyone (see utils/seasons.ts).
  const [season, setSeason] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setConfirmed(window.localStorage.getItem("rr_age_ok") === "1");
    } catch {
      // Storage blocked: they confirm again each visit.
    }
    setInApp(isNativeApp());
    axios
      .get("/api/season")
      .then(({ data }) => {
        const s = shownSeason(data?.season);
        if (s) {
          setSeason(s);
          applyGroupTheme(s.accent);
        }
      })
      .catch(() => {});
    axios
      .get("/api/auth/dev-login?check=1")
      .then(({ data }) => setDevLogin(Boolean(data?.available)))
      .catch(() => setDevLogin(false));
    axios
      .get("/api/auth/roblox/config")
      .then(({ data }) => setRobloxAvailable(Boolean(data?.configured)))
      .catch(() => setRobloxAvailable(false));
    axios
      .get("/api/branding/host")
      .then(({ data }) => {
        if (!data?.success) return;
        setBranding({ name: data.name ?? null, logo: data.logo ?? null, theme: data.theme ?? null, whiteLabel: Boolean(data.whiteLabel) });
        if (data.theme) applyGroupTheme(data.theme);
        if (data.name) document.title = data.name;
      })
      .catch(() => {});
  }, []);

  // Where to go after signing in, when the page that sent them here said so (the server accepts only paths on this site).
  const nextQuery = typeof router.query.next === "string" ? `?next=${encodeURIComponent(router.query.next)}` : "";

  useEffect(() => {
    if (!router.isReady) return;

    const error = router.query.error as string;
    if (error) {
      const { message, suspended: isSuspended } = loginProblem(error);

      if (isSuspended) {
        setSuspendedMessage(message);
      } else {
        toast.error(message, {
          duration: 6000,
          position: "top-center",
        });
      }

      router.replace("/login", undefined, { shallow: true });
    }
  }, [router.isReady, router.query.error]);

  const buttonBase = `flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg px-4 py-3 text-base font-semibold transition-colors motion-reduce:transition-none ${focusRing}`;
  const confirm = (on: boolean) => {
    setConfirmed(on);
    if (on) setNeedsConfirm(false);
    try {
      if (on) window.localStorage.setItem("rr_age_ok", "1");
      else window.localStorage.removeItem("rr_age_ok");
    } catch {
      // Storage blocked: the box still works for this visit.
    }
  };
  // The buttons stay pressable (a button that does nothing, greyed out, doesn't say why): pressing one before the box is ticked explains.
  const go = (href: string) => () => {
    if (!confirmed) {
      setNeedsConfirm(true);
      confirmBox.current?.focus();
      return;
    }
    window.location.href = href;
  };
  const textLink = `rounded underline underline-offset-2 hover:text-ink dark:hover:text-white ${focusRing}`;

  const ageConfirm = (
    <div className="text-left">
      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          ref={confirmBox}
          type="checkbox"
          checked={confirmed}
          onChange={(e) => confirm(e.target.checked)}
          aria-describedby={needsConfirm ? "age-error" : undefined}
          aria-invalid={needsConfirm || undefined}
          className={`mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-ink dark:accent-white ${focusRing}`}
        />
        <span>
          I am 13 or older, and I agree to the <Link href="/legal/terms" className={`${textLink} font-medium text-ink dark:text-white`}>Terms</Link> and the{" "}
          <Link href="/legal/privacy" className={`${textLink} font-medium text-ink dark:text-white`}>Privacy Policy</Link>.
        </span>
      </label>
      {needsConfirm && (
        <p id="age-error" role="alert" className="mt-2 pl-8 text-sm font-medium text-red-700 dark:text-red-300">
          Tick the box to confirm you are 13 or older before you continue.
        </p>
      )}
    </div>
  );

  const title = branding ? "Sign in" : "Sign in to Rosterr";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink">
      <StepPattern />
      <main aria-labelledby="signin-title" className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl bg-white p-7 text-ink dark:bg-zinc-900 dark:text-white sm:p-10">
          {/* The logo sits on the white card, never on the busy pattern. A workspace's own domain shows that workspace instead. */}
          <div className="flex items-center gap-3">
            {branding ? (
              <>
                {branding.logo ? (
                  <img src={branding.logo} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-xl font-bold text-white dark:bg-white dark:text-ink" aria-hidden="true">
                    {(branding.name || "?").trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="text-lg font-semibold">{branding.name ?? "Your workspace"}</p>
              </>
            ) : (
              <Link href="/" aria-label="Rosterr home" className={`rounded ${focusRing}`}>
                <RosterrWordmark height={28} />
              </Link>
            )}
          </div>

          <h1 id="signin-title" className="mt-8 text-h2">{title}</h1>
          <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
            {inApp
              ? "Scan the QR code from the website to sign in."
              : branding
                ? "Members only. You'll sign in with Discord or Roblox, then come straight back here."
                : robloxAvailable
                  ? "Use your Roblox or Discord account. Rosterr needs both linked, so you'll connect the other next if it isn't yet."
                  : "Use your Discord account. You'll link your Roblox account in the next step."}
          </p>
          {season && !branding && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span aria-hidden>{season.emoji}</span> {season.tagline}
            </p>
          )}

          {suspendedMessage && (
            <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-400/40 dark:bg-red-500/15">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">{suspendedMessage}</p>
            </div>
          )}

          <div className="mt-8">
            {!mounted ? null : inApp ? (
              <AppSignIn />
            ) : branding ? (
              <div className="space-y-4">
                {ageConfirm}
                <button type="button" onClick={go("/api/handoff/start")} className={`${buttonBase} bg-ink text-white hover:bg-[#34213f] dark:bg-white dark:text-ink dark:hover:bg-zinc-200`}>
                  Continue to sign in
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {ageConfirm}
                <div className="space-y-3">
                  {robloxAvailable && (
                    <button type="button" onClick={go(`/api/auth/roblox/start${nextQuery}`)} className={`${buttonBase} border border-zinc-300 bg-white text-ink hover:bg-zinc-50`}>
                      <ProviderLogo provider="roblox" on="#ffffff" size={18} />
                      Continue with Roblox
                    </button>
                  )}
                  <button type="button" onClick={go(`/api/auth/discord/start${nextQuery}`)} className={`${buttonBase} bg-[#5865F2] text-white hover:bg-[#4752C4]`}>
                    <ProviderLogo provider="discord" on="#5865F2" size={20} />
                    Continue with Discord
                  </button>
                </div>
                {devLogin && (
                  <div className="rounded-lg border border-dashed border-amber-500 p-3">
                    <button type="button" onClick={() => (window.location.href = `/api/auth/dev-login${nextQuery}`)} className={`${buttonBase} border border-amber-500 text-amber-900 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-white/10`}>
                      Sign in as the demo user
                    </button>
                    <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">Local development only. This never shows on a live site.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-zinc-200 pt-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <Link href="/legal/terms" className={textLink}>Terms</Link>
            <Link href="/legal/privacy" className={textLink}>Privacy</Link>
            <Link href="/legal/copyright#origins" className={textLink}>Credits</Link>
            <Link href="/support" className={textLink}>Support</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
