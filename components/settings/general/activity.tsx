import type { FC } from "@/types/settingsComponent";
import ActivityHealth from "./ActivityHealth";
import LoaderDownloads from "../activity/LoaderDownloads";
import PeriodSettings from "../activity/PeriodSettings";
import TrackingSettings from "../activity/TrackingSettings";
import TrackingCheck from "../activity/TrackingCheck";

// Settings > Activity. People who can only reset activity see just the reset; the rest see tracking, the loader and the schedule too.
const Activity: FC<{ triggerToast?: unknown; hasResetActivityOnly?: boolean }> = ({ hasResetActivityOnly = false }) => (
  <div className="space-y-8">
    {!hasResetActivityOnly && (
      <>
        <section aria-label="Tracking">
          <TrackingSettings />
        </section>
        <section aria-label="Loader">
          <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">Game loader</h4>
          <LoaderDownloads />
        </section>
        <section aria-label="Check tracking">
          <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">Check tracking</h4>
          <TrackingCheck />
        </section>
      </>
    )}
    <section aria-label="Activity period" className={hasResetActivityOnly ? "" : "border-t border-zinc-200 dark:border-zinc-700 pt-6"}>
      <h4 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-white">Activity period</h4>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">Start a new activity timeframe.</p>
      <PeriodSettings canSchedule={!hasResetActivityOnly} />
    </section>
    <ActivityHealth />
  </div>
);

Activity.title = "Reset activity";
Activity.description = "Clear everyone's tracked activity when you start a new period.";

export default Activity;
