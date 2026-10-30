import { useState } from "react";
import { Tab } from "@headlessui/react";
import { Toaster } from "react-hot-toast";
import { useRouter } from "next/router";
import { IconBook, IconCalendar, IconChartBar, IconUser } from "@tabler/icons-react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { loadProfile } from "@/utils/profile/load";
import { writableTypes } from "@/utils/profile/logbook";
import { useProfileHistory } from "@/hooks/useProfileHistory";
import Activity from "@/components/profile/activity";
import ActivityExplain from "@/components/profile/ActivityExplain";
import ProfileOrders from "@/components/profile/Orders";
import Book from "@/components/profile/book";
import { InformationTab } from "@/components/profile/information";
import Notices from "@/components/profile/notices";
import OffboardDialog from "@/components/profile/OffboardDialog";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSummary from "@/components/profile/ProfileSummary";
import RankHistory from "@/components/profile/RankHistory";

export const getServerSideProps = withPermissionCheckSsr(async ({ query, req }) => {
  const viewerId = req.session?.userid;
  const groupId = parseInt(String(query.id), 10);
  if (!viewerId || !Number.isFinite(groupId) || !/^\d{1,18}$/.test(String(query.uid))) return { notFound: true };
  const props = await loadProfile({ groupId, viewerId, targetId: BigInt(String(query.uid)) });
  return props ? { props } : { notFound: true };
});

// What the page receives is exactly what loadProfile produced on the server.
type pageProps = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

const tab = ({ selected }: { selected: boolean }) =>
  `flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap shrink-0 ${selected ? "border-primary text-primary" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`;

const Profile: pageWithLayout<pageProps> = (p) => {
  const router = useRouter();
  const groupId = router.query.id as string;
  const history = useProfileHistory(groupId, p.user.userid);
  const [tabIndex, setTabIndex] = useState(0);
  const [compose, setCompose] = useState(0);
  const canLog = p.logbookEnabled && writableTypes(p.logbookPermissions, false).length > 0;
  // Offboarding writes a resignation or a termination, so it needs one of those rights, and is never for your own profile.
  const canOffboard = !p.isUser && p.logbookEnabled && Boolean(p.logbookPermissions?.resignation || p.logbookPermissions?.termination);
  const [offboarding, setOffboarding] = useState(false);

  // The current period comes with the page; an earlier one comes from the history the person stepped back to.
  const current = {
    timeSpent: p.timeSpent,
    timesPlayed: p.timesPlayed,
    data: p.data,
    quotas: p.quotas,
    sessionsHosted: p.sessionsHosted,
    sessionsSecondaryHosted: p.sessionsSecondaryHosted,
    sessionsAttended: p.sessionsAttended,
    allianceVisits: p.allianceVisits,
    recommendationSubmissions: p.recommendationSubmissions,
    recommendationVotes: p.recommendationVotes,
    sessions: p.sessions,
    adjustments: p.adjustments,
    messages: p.sessions.reduce((n: number, s: any) => n + Number(s.messages || 0), 0),
    idleTime: Math.round(p.sessions.reduce((n: number, s: any) => n + Number(s.idleTime || 0), 0)),
  };
  const shown = history.display ?? current;

  const periodLabel = history.weeksBack > 0 ? history.label() : undefined;
  const pending = p.notices.filter((n: any) => n.reviewed === false).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="pagePadding">
        <Toaster position="bottom-center" />
        <ProfileHeader
          userId={String(p.user.userid)}
          groupId={groupId}
          avatar={p.info.avatar}
          displayName={p.info.displayName}
          username={p.info.username}
          rankName={p.memberRoleName}
          timezone={p.workspaceMember?.timezone}
          notices={p.notices}
          departments={p.workspaceMember?.departments ?? []}
          joinDate={p.user.joinDate}
          manager={p.lineManager}
          inGame={p.sessions.some((s: any) => s.active)}
          onAddEntry={canLog ? () => { setTabIndex(2); setCompose((n) => n + 1); } : undefined}
          onOffboard={canOffboard ? () => setOffboarding(true) : undefined}
        />
        {offboarding && (
          <OffboardDialog groupId={groupId} userId={String(p.user.userid)} name={p.info.displayName || p.info.username} canResign={Boolean(p.logbookPermissions?.resignation)} canTerminate={Boolean(p.logbookPermissions?.termination)} onClose={() => setOffboarding(false)} />
        )}

        <ProfileSummary data={{ timeSpent: shown.timeSpent, timesPlayed: shown.timesPlayed, quotas: shown.quotas, sessionsHosted: shown.sessionsHosted, sessionsSecondaryHosted: shown.sessionsSecondaryHosted, sessionsAttended: shown.sessionsAttended, notices: p.notices }} periodLabel={periodLabel} />

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <Tab.Group selectedIndex={tabIndex} onChange={(i) => { setTabIndex(i); setCompose(0); }}>
            <Tab.List className="mx-4 mt-3 mb-2 flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-700">
              <Tab className={tab}><IconUser className="h-4 w-4" /> Overview</Tab>
              <Tab className={tab}><IconChartBar className="h-4 w-4" /> Activity</Tab>
              {p.logbookEnabled && <Tab className={tab}><IconBook className="h-4 w-4" /> Logbook</Tab>}
              <Tab className={tab}>
                <IconCalendar className="h-4 w-4" /> Notices
                {pending > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">{pending}</span>}
              </Tab>
            </Tab.List>
            <Tab.Panels className="rounded-b-2xl bg-white p-3 dark:bg-zinc-800 sm:p-5">
              <Tab.Panel>
                <InformationTab
                  key={p.user.userid}
                  user={{ userid: String(p.user.userid), username: p.user.username, displayname: p.info.displayName, registered: p.user.registered, birthdayDay: p.workspaceMember?.birthdayDay ?? null, birthdayMonth: p.workspaceMember?.birthdayMonth ?? null, joinDate: p.user.joinDate }}
                  workspaceMember={p.workspaceMember || undefined}
                  availableDepartments={p.availableDepartments}
                  lineManager={p.lineManager}
                  manages={p.manages}
                  allMembers={p.allMembers}
                  isUser={p.isUser}
                  isAdmin={p.isAdmin}
                  canEditMembers={p.canManageMembers}
                />
                {!p.logbookEnabled && (
                  <section className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-700/60" aria-label="Rank history">
                    <h3 className="text-h3 mb-3 text-zinc-900 dark:text-white">Rank history</h3>
                    <RankHistory groupId={groupId} userId={String(p.user.userid)} />
                  </section>
                )}
              </Tab.Panel>
              <Tab.Panel>
                <Activity
                  {...shown}
                  avatar={p.info.avatar}
                  notices={p.notices}
                  isHistorical={history.weeksBack > 0}
                  historicalPeriod={history.historicalPeriod}
                  loadingHistory={history.loading}
                  selectedWeek={history.weeksBack}
                  availableHistory={history.periods}
                  getCurrentWeekLabel={history.label}
                  canGoBack={history.canGoBack}
                  canGoForward={history.canGoForward}
                  goToPreviousWeek={history.back}
                  goToNextWeek={history.forward}
                  canAdjustActivity={p.canAdjustActivity}
                  canSignoffQuotas={p.canSignoffQuotas}
                  targetUserId={p.user.userid}
                  isViewingOwnProfile={p.isUser}
                />
                <ProfileOrders groupId={groupId} userId={String(p.user.userid)} />
                <details className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-zinc-900 dark:text-white">How these minutes add up</summary>
                  <div className="mt-4"><ActivityExplain groupId={groupId} userId={String(p.user.userid)} /></div>
                </details>
              </Tab.Panel>
              {p.logbookEnabled && (
                <Tab.Panel>
                  <Book userBook={p.userBook} logbookPermissions={p.logbookPermissions} composeSignal={compose} />
                  <section className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-700/60" aria-label="Rank history">
                    <h3 className="text-h3 mb-3 text-zinc-900 dark:text-white">Rank history</h3>
                    <RankHistory groupId={groupId} userId={String(p.user.userid)} />
                  </section>
                </Tab.Panel>
              )}
              <Tab.Panel>
                <Notices notices={p.notices} canManageNotices={p.canManageNotices} canApproveNotices={p.canApproveNotices} canRecordNotices={p.canRecordNotices} userId={p.user.userid} />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
};

Profile.layout = workspace;

export default Profile;
