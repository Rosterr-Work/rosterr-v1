import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import moment from "moment";
import toast from "react-hot-toast";
import { Tab } from "@headlessui/react";
import { IconAdjustments, IconCalendarEvent, IconCalendarTime, IconChartBar, IconChevronLeft, IconChevronRight, IconTarget } from "@tabler/icons-react";
import { ActivityOverview } from "@/components/profile/activityoverview";
import { SessionsHistory } from "@/components/profile/sessions";
import { QuotasProgress } from "@/components/profile/quotas";
import { Dialog, ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import ImportedTag from "@/components/ui/ImportedTag";
import type { SessionCounts, ViewedPerson } from "@/utils/profile/props";

type Paging = {
  selectedWeek?: number;
  availableHistory?: any[];
  getCurrentWeekLabel?: () => string;
  goToPreviousWeek?: () => void;
  goToNextWeek?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
};

type Props = SessionCounts &
  ViewedPerson &
  Paging & {
    timeSpent: number;
    timesPlayed: number;
    data: any;
    quotas: any[];
    avatar: string;
    sessions: any[];
    notices: any[];
    adjustments?: any[];
    messages?: number;
    idleTime?: number;
    isHistorical?: boolean;
    historicalPeriod?: { start: string; end: string } | null;
    loadingHistory?: boolean;
    canAdjustActivity?: boolean;
  };

const tabClass = ({ selected }: { selected: boolean }) =>
  `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap shrink-0 transition-all ${selected ? "border-primary text-primary" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`;

/** Add or take away minutes by hand, with a reason. */
function AdjustDialog({ onClose, onSaved, groupId, userId }: { onClose: () => void; onSaved: (delta: number) => void; groupId: string; userId: string }) {
  const [kind, setKind] = useState<"award" | "remove">("award");
  const [minutes, setMinutes] = useState(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Math.min(Math.max(minutes, 0), 1000);
    if (!value) return void toast.error("Enter minutes > 0");
    setSaving(true);
    try {
      const { data } = await axios.post(`/api/workspace/${groupId}/activity/adjustment`, { userId, minutes: value, action: kind, reason });
      if (!data.success) throw new Error("failed");
      toast.success("Adjustment saved");
      onSaved(kind === "remove" ? -value : value);
    } catch {
      toast.error("Could not save adjustment.");
      setSaving(false);
    }
  };

  const choice = (value: "award" | "remove", on: string) => (
    <button type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${kind === value ? `${on} text-white` : "text-zinc-700 dark:text-zinc-200 hover:bg-white/70 dark:hover:bg-zinc-700"}`}>
      {value === "award" ? "Award" : "Remove"}
    </button>
  );

  return (
    <Dialog title="Manual Adjustment" onClose={onClose} actions={<><button className={ghostButton} onClick={onClose}>Cancel</button><button className={solidButton} disabled={saving} onClick={save}>{saving ? "Saving..." : kind === "award" ? "Award Minutes" : "Remove Minutes"}</button></>}>
      <div className="space-y-4 text-left">
        <div className="flex p-0.5 gap-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-lg border border-zinc-200 dark:border-zinc-600">
          {choice("award", "bg-primary")}
          {choice("remove", "bg-red-600")}
        </div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Minutes
          <input aria-label="e.g. 10" type="number" min={1} max={1000} className={`${inputClass} mt-1`} value={minutes} placeholder="e.g. 10" onChange={(e) => setMinutes(Math.min(1000, Math.max(0, parseInt(e.target.value, 10) || 0)))} />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Reason (optional)
          <textarea aria-label="Recognition for outstanding support" rows={3} className={`${inputClass} mt-1 resize-none`} value={reason} placeholder="Recognition for outstanding support" onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
    </Dialog>
  );
}

export default function Activity(p: Props) {
  const router = useRouter();
  const id = router.query.id as string;
  const { isHistorical = false, historicalPeriod = null, loadingHistory = false, selectedWeek = 0, availableHistory = [], adjustments = [], canAdjustActivity = false } = p;

  const [minutes, setMinutes] = useState(p.timeSpent);
  const [idleOn, setIdleOn] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => setMinutes(p.timeSpent), [p.timeSpent]); // a different period brings its own total
  useEffect(() => {
    if (id) axios.get(`/api/workspace/${id}/settings/activity/getConfig`).then((r) => setIdleOn(r.data.idleTimeEnabled ?? true)).catch((e) => console.error("Failed to fetch activity config:", e));
  }, [id]);

  const sum = (key: "idleTime" | "messages") => p.sessions.reduce((n, s) => n + Number(s[key] ?? 0), 0);
  const idle = p.idleTime ?? sum("idleTime");
  const messages = p.messages ?? sum("messages");
  const hosted = p.sessionsHosted + p.sessionsSecondaryHosted;
  const past = selectedWeek > 0 ? availableHistory[selectedWeek - 1] : null;

  return (
    <Tab.Group>
      <Tab.List className="flex border-b border-zinc-200 dark:border-zinc-700 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 px-3 sm:px-4 overflow-x-auto">
        <Tab className={tabClass}><IconChartBar className="w-4 h-4" /> Activity</Tab>
        <Tab className={tabClass}><IconCalendarEvent className="w-4 h-4" /> Sessions</Tab>
        <Tab className={tabClass}><IconTarget className="w-4 h-4" /> Quotas</Tab>
      </Tab.List>

      {p.getCurrentWeekLabel && (
        <div className="flex justify-center mt-4 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700">
            <button onClick={p.goToPreviousWeek} disabled={!p.canGoBack || loadingHistory} aria-label="Earlier period" className="p-1.5 rounded-full text-zinc-500 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 disabled:opacity-50"><IconChevronLeft className="w-4 h-4" /></button>
            <p className="px-2 text-sm font-medium text-zinc-800 dark:text-zinc-50 whitespace-nowrap">
              {past ? `${moment(past.period.start).format("MMM DD")} - ${moment(past.period.end).format("MMM DD, YYYY")}` : p.getCurrentWeekLabel()}
            </p>
            <button onClick={p.goToNextWeek} disabled={!p.canGoForward || loadingHistory} aria-label="Later period" className="p-1.5 rounded-full text-zinc-500 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 disabled:opacity-50"><IconChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {loadingHistory ? (
        <div className="flex items-center justify-center py-12">
          <div className="bg-white dark:bg-zinc-700 rounded-lg p-8 max-w-md text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse text-primary"><IconChartBar className="w-8 h-8" /></div>
            <h3 className="text-h3 text-zinc-900 dark:text-white mb-1">Loading Historical Data</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Please wait while we fetch the activity data...</p>
          </div>
        </div>
      ) : (
        <div>
          {isHistorical && historicalPeriod && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-lg text-amber-600 dark:text-amber-400"><IconCalendarTime className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200">Historical Activity Data</h3>
                <p className="text-xs text-amber-700 dark:text-amber-300">Showing activity from {moment(historicalPeriod.start).format("MMM DD")} - {moment(historicalPeriod.end).format("MMM DD, YYYY")}</p>
                <ImportedTag record={past?.period} className="mt-1" />
              </div>
            </div>
          )}
          <Tab.Panels className="min-h-[400px]">
            <Tab.Panel>
              {!isHistorical && canAdjustActivity && (
                <div className="flex justify-end mb-4"><button onClick={() => setAdjusting(true)} className={solidButton}><IconAdjustments className="w-4 h-4" /> Manual Adjustment</button></div>
              )}
              <ActivityOverview data={p.data} displayMinutes={minutes} messages={messages} idleTime={idle} sessionsHosted={hosted} sessionsAttended={p.sessionsAttended} idleTimeEnabled={idleOn} notices={p.notices} adjustments={adjustments} sessions={p.sessions} avatar={p.avatar} />
            </Tab.Panel>
            <Tab.Panel>
              <SessionsHistory sessionsHosted={hosted} sessionsAttended={p.sessionsAttended} isHistorical={isHistorical} historicalPeriod={historicalPeriod} />
            </Tab.Panel>
            <Tab.Panel>
              <QuotasProgress quotas={p.quotas} displayMinutes={minutes} sessionsHosted={p.sessionsHosted} sessionsSecondaryHosted={p.sessionsSecondaryHosted} sessionsAttended={p.sessionsAttended} allianceVisits={p.allianceVisits} recommendationSubmissions={p.recommendationSubmissions} recommendationVotes={p.recommendationVotes} canSignoffQuotas={p.canSignoffQuotas} targetUserId={p.targetUserId} isViewingOwnProfile={p.isViewingOwnProfile} workspaceId={id} isHistorical={isHistorical} periodEnd={historicalPeriod?.end} />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      )}

      {adjusting && <AdjustDialog groupId={id} userId={router.query.uid as string} onClose={() => setAdjusting(false)} onSaved={(d) => { setMinutes((m) => m + d); setAdjusting(false); }} />}
    </Tab.Group>
  );
}
