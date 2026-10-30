import { Fragment } from "react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import clsx from "clsx";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { workspacestate } from "@/state";
import { useAppleGlass } from "@/hooks/useAppleGlass";
import { useWorkspaceFeatures } from "@/hooks/useWorkspaceFeatures";
import { useNavCounts } from "@/hooks/useNavCounts";
import { glassChrome } from "@/utils/liquidGlass";
import { badgeFor, badgeText, canOpenSettings, sidebarNav } from "@/utils/nav/workspaceNav";
import { NAV_ICONS } from "@/components/layout/navIcons";

// The main menu on a computer: one icon per part of the workspace, with its name on hover. What is offered comes from utils/nav/workspaceNav.ts
// (the phone's bottom bar uses the same rules).

// Entries that belong together sit together, with a thin line between groups. Order still comes from sidebarNav; this only decides
// where the lines go, so an entry that is switched off just leaves its group smaller.
const GROUP: Record<string, number> = { home: 0, wall: 0, activity: 1, sessions: 1, mail: 1, tasks: 1, docs: 2, staff: 2, moderation: 3, applications: 3, careers: 3, alliances: 3 };

const button = (active: boolean) =>
  clsx(
    "flex w-full flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    active ? "bg-zinc-100 text-ink dark:bg-zinc-800 dark:text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-ink dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
  );

function Entry({ name, active, badge, icon, onOpen }: { name: string; active: boolean; badge?: number; icon: IconSvgElement; onOpen: (e: React.MouseEvent) => void }) {
  return (
    <div className="relative w-full">
      <button type="button" onClick={onOpen} className={button(active)} aria-label={name} aria-current={active ? "page" : undefined} title={name}>
        <HugeiconsIcon icon={icon} className="h-5 w-5" strokeWidth={1.5} />
        <span className={clsx("w-full truncate text-center text-[11px] leading-4", active ? "font-semibold" : "font-medium")}>{name}</span>
      </button>
      {badge ? (
        <span className="pointer-events-none absolute right-2 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">{badgeText(badge)}</span>
      ) : null}
    </div>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const ws = useRecoilValue(workspacestate);
  const glass = useAppleGlass();
  const features = useWorkspaceFeatures(ws?.groupId);
  const permissions = ws.yourPermission ?? [];
  const isAdmin = Boolean(ws.isAdmin);
  const counts = useNavCounts(ws?.groupId, {
    policies: features.policies,
    notices: isAdmin || permissions.includes("approve_notices") || permissions.includes("manage_notices"),
  });

  const items = ws?.groupId
    ? sidebarNav({
        groupId: ws.groupId,
        permissions,
        isAdmin,
        features: { ...features, guides: ws.settings?.guidesEnabled ?? true },
      })
    : [];
  const settingsHref = `/workspace/${ws.groupId}/settings`;

  // Scroll the page back to the top after moving.
  const go = (href: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return void window.open(href, "_blank");
    void router.push(href, undefined, { scroll: false }).then(() => document.getElementById("main-content-scroll")?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  };

  return (
    <aside aria-label="Main menu" className={clsx("hidden md:flex h-full flex-col pointer-events-auto w-[5.25rem] min-w-[5.25rem]", glass ? glassChrome("border-y-0 border-l-0") : "border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950")}>
      <div className="flex h-full flex-col gap-1 overflow-visible p-1.5">
        <nav className="scrollbar-hide flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-clip py-1">
          {items.map((item, i) => {
            const active = item.matchPaths ? item.matchPaths.some((p) => router.asPath.startsWith(p)) : router.asPath === item.href;
            const newGroup = i > 0 && GROUP[item.id] !== GROUP[items[i - 1].id];
            return (
              <Fragment key={item.id}>
                {newGroup && <div className="my-1 h-px w-8 shrink-0 bg-zinc-200 dark:bg-zinc-700" role="separator" />}
                <Entry name={item.name} active={active} badge={badgeFor(item.id, counts)} icon={NAV_ICONS[item.id]} onOpen={(e) => go(item.href, e)} />
              </Fragment>
            );
          })}
        </nav>
        {canOpenSettings(permissions) && (
          <div className="flex flex-shrink-0 flex-col items-center gap-1 border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <Entry name="Settings" active={router.asPath.startsWith(settingsHref)} icon={Settings01Icon} onOpen={(e) => go(settingsHref, e)} />
          </div>
        )}
      </div>
    </aside>
  );
}
