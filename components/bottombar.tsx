import { Fragment, useState } from "react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, MoreHorizontalIcon, Settings01Icon } from "@hugeicons/core-free-icons";
import { loginState, workspacestate } from "@/state";
import { useAppleGlass } from "@/hooks/useAppleGlass";
import { useWorkspaceFeatures } from "@/hooks/useWorkspaceFeatures";
import { useNavCounts } from "@/hooks/useNavCounts";
import { glassChrome, glassMenu } from "@/utils/liquidGlass";
import { badgeFor, badgeText, bottomNav } from "@/utils/nav/workspaceNav";
import { NAV_ICONS } from "@/components/layout/navIcons";
import NotificationsPanel from "@/components/notifications/Bell";
import { openIntercom } from "./IntercomLoader";

// The menu on a phone: four pages and Notifications along the bottom, everything else under "More". What is offered comes from
// utils/nav/workspaceNav.ts (the side menu on a computer uses the same rules).

// No floating chat bubble on a phone (see utils/intercomClient.ts): Help and Support opens it from here instead.
const INTERCOM_ENABLED = Boolean(process.env.NEXT_PUBLIC_INTERCOM_APP_ID);

const tone = (on: boolean, off: string) => (on ? "text-primary" : off);

export default function BottomBar() {
  const router = useRouter();
  const login = useRecoilValue(loginState);
  const ws = useRecoilValue(workspacestate);
  const glass = useAppleGlass();
  const features = useWorkspaceFeatures(ws.groupId);
  const [more, setMore] = useState(false);
  const permissions = ws.yourPermission ?? [];
  const isAdmin = Boolean(ws.isAdmin);
  const counts = useNavCounts(ws.groupId, { policies: features.policies, notices: isAdmin || permissions.includes("approve_notices") || permissions.includes("manage_notices") });

  const nav = bottomNav({ groupId: ws.groupId, permissions, isAdmin, features: { ...features, guides: true } }, { help: INTERCOM_ENABLED && !!login?.username });
  const here = (href: string) => (href === `/workspace/${ws.groupId}` ? router.asPath === href : Boolean(href) && router.asPath.startsWith(href));
  const moreActive = nav.more.some((i) => here(i.href));
  const go = (href: string) => {
    void router.push(href);
    setMore(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <nav className={clsx("fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom", glass ? glassChrome("border-x-0 border-b-0") : "bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-700")}>
        <div className="flex justify-around items-center h-16 px-2">
          {nav.main.map((item) => {
            const on = here(item.href);
            return (
              <button key={item.id} type="button" onClick={() => go(item.href)} className="flex flex-col items-center justify-center flex-1 py-2 group">
                <HugeiconsIcon icon={NAV_ICONS[item.id]} strokeWidth={1.5} className={clsx("w-6 h-6 transition-colors", tone(on, "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"))} />
                <span className={clsx("text-xs mt-1 transition-colors", on ? "text-primary font-medium" : "text-zinc-500 dark:text-zinc-400")}>{item.name}</span>
              </button>
            );
          })}
          <NotificationsPanel variant="bottombar" />
          {nav.more.length > 0 && (
            <button type="button" onClick={() => setMore(true)} className="flex flex-col items-center justify-center flex-1 py-2 group">
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.5} className={clsx("w-6 h-6 transition-colors", tone(moreActive, "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"))} />
              <span className={clsx("text-xs mt-1 transition-colors", moreActive ? "text-primary font-medium" : "text-zinc-500 dark:text-zinc-400")}>More</span>
            </button>
          )}
        </div>
      </nav>

      <Transition appear show={more} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setMore(false)}>
          <div className="fixed inset-0 bg-black/25" onClick={() => setMore(false)} />
          <div className="fixed inset-0 flex items-end justify-center pointer-events-none">
            <Transition.Child as={Fragment} enter="ease-rr duration-200" enterFrom="translate-y-full" enterTo="translate-y-0" leave="ease-rr duration-150" leaveFrom="translate-y-0" leaveTo="translate-y-full">
              <Dialog.Panel className={clsx("w-full max-w-lg overflow-hidden rounded-t-2xl shadow-xl pointer-events-auto safe-area-bottom", glass ? glassMenu() : "bg-white dark:bg-zinc-800")}>
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                  <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">More</Dialog.Title>
                  <button type="button" aria-label="Close" onClick={() => setMore(false)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-3 gap-4">
                  {nav.more.map((item) => {
                    const on = here(item.href);
                    const badge = badgeFor(item.id, counts);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => (item.id === "help" ? (setMore(false), openIntercom()) : go(item.href))}
                        className={clsx("relative flex flex-col items-center justify-center p-4 rounded-xl transition-colors", on ? "bg-primary/10" : "hover:bg-zinc-100 dark:hover:bg-zinc-700")}
                      >
                        <HugeiconsIcon icon={item.id === "settings" ? Settings01Icon : NAV_ICONS[item.id]} strokeWidth={1.5} className={clsx("w-7 h-7", tone(on, "text-zinc-600 dark:text-zinc-300"))} />
                        <span className={clsx("text-xs mt-2", on ? "text-primary font-medium" : "text-zinc-600 dark:text-zinc-300")}>{item.name}</span>
                        {badge > 0 && <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{badgeText(badge)}</span>}
                      </button>
                    );
                  })}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
