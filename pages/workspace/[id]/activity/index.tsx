import { useRouter } from "next/router";
import useSWR from "swr";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { useProfileHistory } from "@/hooks/useProfileHistory";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import Activity from "@/components/profile/activity";
import { PresenceCards, Podium, RankList } from "@/components/leaderboard/Board";
import { ghostButton } from "@/components/ui/parts";

// Your own activity: the same Activity, Sessions and Quotas views as on a profile, for you. On a phone the leaderboard is here too.
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const MyActivity: pageWithLayout<{}> = () => {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const { data: me, error } = useSWR(id ? `/api/workspace/${id}/activity/me` : null, (u: string) => axios.get(u).then((r) => r.data), { refreshInterval: 30_000, revalidateOnFocus: false });
  const history = useProfileHistory(id, me?.userId);
  const { board, style } = useLeaderboard(id, "current", "list");
  const top = board?.topStaff ?? [];
  const shown = history.display ?? me;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="pagePadding">
        <Toaster position="bottom-center" />
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-h2 text-zinc-900 dark:text-white">Activity Dashboard</h1>
          </div>
          <a href={`/workspace/${id}/wrapped`} className={`${ghostButton} ml-auto`}>
            Your Wrapped
          </a>
        </div>

        {top.length > 0 && (
          <div className="md:hidden space-y-4 mb-8">
            {style === "podium" ? <Podium top={top} compact /> : <RankList top={top} limit={3} />}
            <PresenceCards active={board?.activeUsers ?? []} away={board?.inactiveUsers ?? []} />
          </div>
        )}

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">Failed to load activity data. Please try refreshing the page.</p>
        ) : !me ? (
          <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-3 sm:p-4">
            <Activity
              {...shown}
              messages={history.display ? shown.messages : me.sessions.reduce((n: number, s: any) => n + Number(s.messages || 0), 0)}
              idleTime={history.display ? shown.idleTime : me.totalIdleTime}
              avatar={me.avatar}
              notices={me.notices}
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
              targetUserId={me.userId}
              isViewingOwnProfile
            />
          </div>
        )}
      </div>
    </div>
  );
};

MyActivity.layout = workspace;

export default MyActivity;
