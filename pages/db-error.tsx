import { useEffect } from "react";
import Router, { useRouter } from "next/router";

// Shown while the app has no database to talk to (DATABASE_URL isn't set). Once it is, this page sends visitors on to the front page.

export default function DatabaseNotConfigured() {
  const router = useRouter();
  const configured = process.env.NEXT_PUBLIC_DATABASE_CHECK === "true";

  useEffect(() => {
    if (configured) Router.replace("/");
  }, [configured]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-900/60 px-9 py-10 text-center shadow-2xl backdrop-blur-md">
        <h1 className="mb-4 text-h1 text-rosterr">Database not configured</h1>
        <p className="mb-6 leading-relaxed text-zinc-300">
          Set the <code className="rounded bg-zinc-700/70 px-1.5 py-0.5 text-sm">DATABASE_URL</code> environment variable in your deployment.
        </p>
        <button type="button" onClick={() => router.reload()} className="rounded-lg bg-rosterr px-5 py-2 font-medium text-white transition hover:bg-orange-600">
          Reload page
        </button>
      </div>
    </main>
  );
}
