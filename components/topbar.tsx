import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";
import Notification from "@/components/notifications/Bell";
import { RosterrWordmark } from "@/components/brand/RosterrMark";
import AccountMenu from "@/components/layout/AccountMenu";
import QuickActions from "@/components/home/QuickActions";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";
import WorkspaceFinder from "@/components/layout/WorkspaceFinder";
import { IconSearch } from "@tabler/icons-react";
import { useAppleGlass } from "@/hooks/useAppleGlass";
import { glassChrome } from "@/utils/liquidGlass";

// The bar along the top: the workspace switcher on the left (inside a workspace), the New menu, the finder (Cmd+K), notifications and the
// account menu on the right.

export default function Topbar() {
  const router = useRouter();
  const glass = useAppleGlass();
  const inWorkspace = router.pathname.startsWith("/workspace/");
  const [finder, setFinder] = useState(0);
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);

  return (
    <header className={clsx("sticky top-0 z-[60]", glass ? glassChrome("border-x-0 border-t-0") : "border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950")}>
      <div className="w-full px-3">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center space-x-3">
            {inWorkspace ? (
              <WorkspaceSwitcher />
            ) : (
              <Link href="/?home=true" aria-label="Rosterr: your workspaces" className="rounded-md px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta-deep">
                <RosterrWordmark height={22} />
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {inWorkspace && <QuickActions groupId={router.query.id as string | undefined} />}
            {inWorkspace && (
              <button
                type="button"
                onClick={() => setFinder((n) => n + 1)}
                aria-label="Find in this workspace"
                aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
                className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white sm:border sm:border-zinc-200 sm:pl-2.5 sm:pr-1.5 dark:sm:border-zinc-700"
              >
                <IconSearch className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[11px] text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 sm:inline">{mac ? "⌘K" : "Ctrl K"}</kbd>
              </button>
            )}
            {inWorkspace && <WorkspaceFinder openSignal={finder} />}
            {inWorkspace && (
              <div className="hidden sm:block">
                <Notification variant="topbar" />
              </div>
            )}
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
