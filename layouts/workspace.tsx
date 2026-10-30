import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import clsx from "clsx";
import { useRecoilState, useRecoilValue } from "recoil";
import { loginState, workspacestate } from "@/state";
import type { LayoutProps } from "@/layoutTypes";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import BottomBar from "@/components/bottombar";
import WhatsNew from "@/components/layout/WhatsNew";
import SupportModeBanner from "@/components/platform/SupportModeBanner";
import BirthdayPrompt from "@/components/home/BirthdayPrompt";
import SecondaryMenu, { type RenderSection } from "@/components/layout/SecondaryMenu";
import ApiKeyAlert from "@/components/layout/ApiKeyAlert";
import { iconFor } from "@/components/layout/menuIcons";
import { useMenuData } from "@/components/layout/useMenuData";
import { useWorkspaceFeatures } from "@/hooks/useWorkspaceFeatures";
import { useNavCounts } from "@/hooks/useNavCounts";
import { useMailSidebar } from "@/utils/mailSidebar";
import { isStaffPage, secondaryMenu } from "@/utils/nav/secondary";
import { applyWorkspaceTheme } from "@/utils/seasonClient";
import WorkspaceAd from "@/components/ads/WorkspaceAd";

// The frame around every workspace page: top bar, main menu, the second menu (follows the page), and the phone bottom bar.
// What each menu offers is worked out in utils/nav; this only loads the workspace and puts the pieces together.

const Workspace: LayoutProps = ({ children }) => {
  const router = useRouter();
  const [ws, setWorkspace] = useRecoilState(workspacestate);
  const login = useRecoilValue(loginState);
  const mail = useMailSidebar();
  const [featuresSeen, setFeaturesSeen] = useState(false);
  const id = router.query.id as string | undefined;
  // Mail fills the screen below the top bar: its page is as tall as the space it is given, not as tall as its content.
  const fillHeight = router.pathname === "/workspace/[id]/mail";
  const permissions = useMemo(() => ws.yourPermission ?? [], [ws.yourPermission]);
  const isAdmin = Boolean(ws.isAdmin);
  const has = (p: string) => isAdmin || permissions.includes(p);

  // Load the workspace; suspended or unknown workspaces go to the right page instead.
  useEffect(() => {
    if (!id) return;
    // The menus ask about this workspace straight away; don't leave them with the id of the page the app was opened on.
    setWorkspace((prev) => (prev.groupId === Number(id) ? prev : { ...prev, groupId: Number(id) }));
    axios
      .get(`/api/workspace/${id}`)
      .then((res) => setWorkspace(res.data.workspace))
      .catch((e) => router.push(e?.response?.data?.error === "workspace_suspended" ? "/workspace-suspended" : "/"));
  }, [id, setWorkspace]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ws?.groupTheme) applyWorkspaceTheme(ws.groupTheme, ws.season);
  }, [ws]);

  const features = useWorkspaceFeatures(id);
  const policies = features.policies;
  const counts = useNavCounts(id, { policies, notices: has("approve_notices") || has("manage_notices") });
  const data = useMenuData({ groupId: id, wantsViews: isStaffPage(router.asPath, id), canUseViews: has("use_views") });

  const sections = useMemo<RenderSection[] | null>(() => {
    if (id && router.asPath.includes(`/workspace/${id}/mail`) && mail) return mail;
    const menu = secondaryMenu({
      groupId: id,
      path: router.asPath,
      query: { view: router.query.view as string | undefined, section: router.query.section as string | undefined },
      permissions,
      isAdmin,
      features: { policies, recommendations: features.recommendations },
      counts,
      views: data.views,
    });
    if (!menu) return null;
    return menu.sections.map((s) => ({
      title: s.title,
      icon: iconFor(s.icon),
      draggable: s.draggable,
      onAdd: s.add ? () => router.push(`/workspace/${id}/views?newView=${s.add}`) : undefined,
      onReorder: s.reorder ? (order: string[]) => data.reorder(s.reorder!, order) : undefined,
      items: s.items.map((i) => ({
        id: i.id,
        label: i.label,
        href: i.href,
        icon: iconFor(i.icon),
        color: i.color,
        active: i.active,
        badge: i.badge,
        onDelete: i.deletable ? data.remove : undefined,
      })),
    }));
  }, [id, router.asPath, router.query.view, router.query.section, permissions, isAdmin, policies, features.recommendations, counts, mail, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = Boolean(ws.ownerId && login?.userId && Number(login.userId) === Number(ws.ownerId));
  const title = ws.groupName ? (ws.whiteLabel ? ws.groupName : `Rosterr · ${ws.groupName}`) : "Loading...";

  return (
    <div className="h-screen-safe overflow-hidden bg-white dark:bg-zinc-950">
      <Head>
        <title>{title}</title>
        {ws.groupThumbnail && <link rel="icon" href={ws.groupThumbnail} />}
      </Head>
      <SupportModeBanner />
      <div className="flex flex-col h-screen-safe overflow-hidden">
        <Topbar />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          {sections ? (
            <SecondaryMenu sections={sections} />
          ) : (
            <div className="hidden md:flex w-4 h-full bg-zinc-50 dark:bg-zinc-900 flex-shrink-0" />
          )}
          <main id="main-content-scroll" className={clsx("flex-1 transition-all duration-300 overflow-y-auto pb-20 md:pb-0 bg-zinc-50 dark:bg-zinc-900", fillHeight && "flex flex-col")}>
            <ApiKeyAlert groupId={ws.groupId} canSee={isOwner || isAdmin} />
            <div key={router.asPath.split(/[?#]/)[0]} className={clsx("rr-enter", fillHeight && "flex flex-1 flex-col")}>{children}</div>
            {/* Free workspaces only (utils/ads/rules.ts); not on Mail, which fills the screen. */}
            {!fillHeight && <WorkspaceAd />}
            {featuresSeen && id && <BirthdayPrompt workspaceId={id} />}
            <WhatsNew groupId={id} onReady={() => setFeaturesSeen(true)} />
          </main>
        </div>
        <BottomBar />
      </div>
    </div>
  );
};

export default Workspace;
