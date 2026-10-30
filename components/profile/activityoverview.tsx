import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import moment from "moment";
import toast from "react-hot-toast";
import { IconCalendarTime, IconClipboardList, IconClock, IconPlayerPlay, IconUsers } from "@tabler/icons-react";
import { Avatar, Dialog, EmptyState, Section, solidButton } from "@/components/ui/parts";
import type { SessionCounts } from "@/utils/profile/props";
import { DAYS, barHeights, buildTimeline, hasLiveSession, isLive, sessionLength } from "@/utils/profile/timeline";

type Props = Pick<SessionCounts, "sessionsHosted" | "sessionsAttended"> & {
  idleTimeEnabled: boolean;
  displayMinutes: number;
  idleTime: number;
  messages: number;
  data: number[];
  sessions: any[];
  adjustments: any[];
  notices?: any[];
  avatar: string;
};

function Metric({ icon, label, title, value, caption }: { icon: JSX.Element; label: string; title: string; value: number; caption: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="text-label text-zinc-500 dark:text-zinc-400">{title}</h2>
      <div className="mt-2">
        <div className="text-data text-3xl text-zinc-900 dark:text-white">{value}</div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{caption}</p>
      </div>
    </div>
  );
}

/** Minutes on each weekday as plain bars. */
function WeekBars({ minutes }: { minutes: number[] }) {
  const heights = barHeights(minutes);
  // Brand duotone: the busiest day is Rosterr pink, the rest are ink-grey, so the week reads at a glance.
  const peak = Math.max(0, ...minutes.map((m) => m || 0));
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
      <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Activity in minutes, this week</p>
      <div className="flex items-end gap-2 h-32" role="img" aria-label={DAYS.map((d, i) => `${d} ${minutes[i] ?? 0} minutes`).join(", ")}>
        {DAYS.map((d, i) => (
          <div key={d} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{minutes[i] || ""}</span>
            <div
              className={`w-full rounded-t ${peak > 0 && (minutes[i] || 0) === peak ? "bg-magenta" : "bg-zinc-300 dark:bg-zinc-600"}`}
              style={{ height: `${Math.max(heights[i] ?? 0, minutes[i] ? 4 : 0)}%` }}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** What happened in one play session: how long, idle time, messages, and who else was there. */
function SessionDetails({ id, sessionId, idleTimeEnabled, onClose }: { id: string; sessionId: string; idleTimeEnabled: boolean; onClose: () => void }) {
  const [info, setInfo] = useState<{ data: any; universe: any } | null>(null);
  const [others, setOthers] = useState<any[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await axios.get(`/api/workspace/${id}/activity/${sessionId}`);
        if (!live) return;
        setInfo({ data: data.message, universe: data.universe ?? null });
        if (data.universe && data.message?.startTime && data.message?.endTime) {
          const r = await axios.get(`/api/workspace/${id}/activity/concurrent?sessionId=${sessionId}&startTime=${data.message.startTime}&endTime=${data.message.endTime}`).catch(() => null);
          if (live && r) setOthers(r.data.users || []);
        }
      } catch {
        toast.error("Could not fetch session.");
        onClose();
      }
    })();
    return () => { live = false; };
  }, [id, sessionId, onClose]);

  const minutes = info ? sessionLength(info.data) : 0;
  const idle = info?.data?.idleTime || 0;
  const messages = info?.data?.messages || 0;
  return (
    <Dialog title={info?.data?.sessionMessage || info?.universe?.name || "Activity Session Details"} onClose={onClose} actions={<button className={`${solidButton} w-full`} onClick={onClose}>Close</button>}>
      {!info ? (
        <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="space-y-3 text-left">
          {info.universe?.thumbnail && <img src={info.universe.thumbnail} alt="Game thumbnail" className="w-full h-28 object-cover rounded-lg" />}
          <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{minutes} {minutes === 1 ? "minute" : "minutes"}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Duration</div>
          </div>
          <div className={`grid gap-3 ${idleTimeEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
            {idleTimeEnabled && (
              <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
                <div className="text-xl font-semibold text-zinc-900 dark:text-white">{idle}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Idle {idle === 1 ? "minute" : "minutes"}</div>
              </div>
            )}
            <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 text-center">
              <div className="text-xl font-semibold text-zinc-900 dark:text-white">{messages}</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">{messages === 1 ? "Message" : "Messages"}</div>
            </div>
          </div>
          {others.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Played with:</span>
              {others.map((u) => <span key={u.userId} title={u.username}><Avatar src={u.picture || "/default-avatar.jpg"} userId={u.userId} size={32} alt={u.username} /></span>)}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

export function ActivityOverview({ data, displayMinutes, messages, idleTime, idleTimeEnabled, adjustments, sessions, avatar }: Props) {
  const router = useRouter();
  const id = router.query.id as string;
  const timeline = useMemo(() => buildTimeline(sessions, adjustments), [sessions, adjustments]);
  const [open, setOpen] = useState<string | null>(null);
  const [, tick] = useState(0);
  const close = useCallback(() => setOpen(null), []);

  // A session still going counts up, so redraw each minute while there is one.
  useEffect(() => {
    if (!hasLiveSession(timeline)) return;
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [timeline]);

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-4 ${idleTimeEnabled ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <Metric icon={<IconPlayerPlay className="w-5 h-5" />} label="Activity" title="Activity Metrics" value={displayMinutes} caption="minutes of activity" />
        <Metric icon={<IconUsers className="w-5 h-5" />} label="Messages" title="Messages Sent" value={messages} caption="messages during this period" />
        {idleTimeEnabled && <Metric icon={<IconClock className="w-5 h-5" />} label="Idle time" title="Idle Time" value={idleTime} caption="minutes idle" />}
      </div>

      {data?.length === 7 && <WeekBars minutes={data} />}

      <Section icon={<IconCalendarTime className="w-5 h-5" />} title="Activity Timeline" hint="Sessions and manual adjustments">
        {timeline.length === 0 ? (
          <EmptyState icon={<IconClipboardList className="w-7 h-7" />} title="No Activity" text="No activity or adjustments have been recorded yet." />
        ) : (
          <ol className="relative border-l border-zinc-200 dark:border-zinc-600 ml-3 mt-3">
            {timeline.map((item) => {
              if (item.__type === "adjustment") {
                const positive = item.minutes > 0;
                return (
                  <li key={`adjust-${item.id}`} className="mb-6 ml-6">
                    <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-zinc-800 text-white text-xs font-bold ${positive ? "bg-emerald-500" : "bg-red-500"}`}>{positive ? "+" : "-"}</span>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-700/60 rounded-lg border border-zinc-100 dark:border-zinc-600">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">Manual Adjustment</p>
                        <time className="text-xs text-zinc-500 dark:text-zinc-300">{moment(item.createdAt).format("DD MMM YYYY, HH:mm")}</time>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-200">{positive ? "Awarded" : "Removed"} {Math.abs(item.minutes)} minutes by {item.actor?.username || "Unknown"}</p>
                      {item.reason && <p className="text-xs italic text-zinc-500 dark:text-zinc-400 mt-1">Reason: {item.reason}</p>}
                    </div>
                  </li>
                );
              }
              const live = isLive(item);
              const mins = sessionLength(item as any);
              return (
                <li key={`session-${item.id}`} className="mb-6 ml-6">
                  <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-zinc-800 ${live ? "bg-emerald-500 animate-pulse" : "bg-primary"}`}>
                    {live ? <span className="w-3 h-3 bg-white rounded-full" /> : <img className="rounded-full" src={item.user?.picture || avatar} alt="" />}
                  </span>
                  <button type="button" disabled={live} onClick={() => setOpen(String(item.id))} className={`block w-full text-left p-4 rounded-lg border ${live ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700" : "bg-zinc-50 dark:bg-zinc-700/60 border-zinc-100 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                        Activity Session
                        {live && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">LIVE</span>}
                      </span>
                      <time className="text-xs text-zinc-500 dark:text-white">
                        {live ? `Started at ${moment(item.startTime).format("HH:mm")} • ${mins}m` : `${moment(item.startTime).format("HH:mm")} - ${moment(item.endTime).format("HH:mm")} on ${moment(item.startTime).format("DD MMM YYYY")} • ${mins}m`}
                      </time>
                    </div>
                    {live && <p className="text-xs text-zinc-600 dark:text-zinc-300">Currently active in game</p>}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      {open && <SessionDetails id={id} sessionId={open} idleTimeEnabled={idleTimeEnabled} onClose={close} />}
    </div>
  );
}
