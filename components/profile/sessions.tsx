import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { IconCalendarEvent, IconChevronDown, IconChevronUp, IconClock, IconHistory, IconPercentage, IconUser, IconUserCheck, IconUserX, IconUsers } from "@tabler/icons-react";
import { useSessionColors } from "@/hooks/useSessionColors";
import { Avatar, EmptyState, Pill, Section } from "@/components/ui/parts";
import { rateText, type AttendanceSummary } from "@/utils/sessions/attendanceRules";
import { fmtDate, fmtTime } from "@/utils/formatDate";

type Props = {
  sessions?: any[];
  notices?: any[];
  adjustments?: any[];
  avatar?: string;
  idleTimeEnabled?: boolean;
  sessionsHosted: number;
  sessionsAttended: number;
  isHistorical?: boolean;
  historicalPeriod?: { start: string; end: string } | null;
};

const date = (d: string) => fmtDate(new Date(d), { month: "short", day: "numeric", year: "numeric" });
const clock = (d: string) => fmtTime(new Date(d), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

type Attendance = { summary: AttendanceSummary; sessions: { sessionId: string; status: string; source: string; walkIn: boolean }[] };
const TONE: Record<string, "green" | "amber" | "red" | "blue"> = { present: "green", late: "amber", absent: "red", excused: "blue" };

function Counter({ icon, label, title, value, caption }: { icon: JSX.Element; label: string; title: string; value: number | string; caption: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-zinc-500 dark:text-zinc-400">{icon}</div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
        </div>
      </div>
      <div className="text-center">
        <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1">{value}</div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{caption}</p>
      </div>
    </div>
  );
}

/** The people in a session, grouped under their slot's category. */
function Participants({ session }: { session: any }) {
  const slots: any[] = Array.isArray(session.sessionType.slots) ? session.sessionType.slots : [];
  const groups = new Map<string, { name: string | null; rows: { p: any; slot: any }[] }>();
  for (const p of session.users ?? []) {
    const slot = slots.find((s) => s.id === p.roleID) ?? null;
    const key = slot?.categoryId || "";
    if (!groups.has(key)) groups.set(key, { name: slot?.categoryName || null, rows: [] });
    groups.get(key)!.rows.push({ p, slot });
  }
  const ordered = [...groups.entries()].sort(([a, x], [b, y]) => (a === "" ? 1 : b === "" ? -1 : (x.name ?? "").localeCompare(y.name ?? "")));
  return (
    <div className="space-y-3">
      {ordered.map(([key, g]) => (
        <div key={key || "none"}>
          {g.name && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{g.name}</span>
              <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
            </div>
          )}
          <ul className="grid gap-2">
            {g.rows.map(({ p, slot }) => (
              <li key={`${p.userid}-${p.slot}`} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
                {p.user?.picture ? <Avatar src={p.user.picture} userId={p.userid.toString()} size={32} alt={p.user.username || "User"} /> : <span className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-600 flex items-center justify-center text-xs font-bold">{p.user?.username?.[0]?.toUpperCase() || "?"}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{p.user?.username || "Unknown"}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{slot?.name || p.roleID}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SessionsHistory({ sessionsHosted, sessionsAttended, isHistorical = false, historicalPeriod = null }: Props) {
  const router = useRouter();
  const { id, uid } = router.query as { id?: string; uid?: string };
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const { getSessionTypeColor, getTextColorForBackground } = useSessionColors(id as string);

  useEffect(() => {
    if (!id || !uid) return;
    const params = isHistorical && historicalPeriod ? `?${new URLSearchParams({ periodStart: historicalPeriod.start, periodEnd: historicalPeriod.end })}` : "";
    axios.get(`/api/workspace/${id}/profile/${uid}/sessions${params}`).then((r) => r.data.success && setRows(r.data.sessions)).catch((e) => console.error("Failed to fetch session history:", e)).finally(() => setLoading(false));
    axios.get(`/api/workspace/${id}/profile/${uid}/attendance${params}`).then((r) => r.data.success && setAttendance(r.data.attendance)).catch(() => setAttendance(null));
  }, [id, uid, isHistorical, historicalPeriod]);

  const marks = new Map((attendance?.sessions ?? []).map((a) => [a.sessionId, a]));
  const toggle = (sid: string) => setOpen((s) => { const n = new Set(s); n.has(sid) ? n.delete(sid) : n.add(sid); return n; });

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Counter icon={<IconUsers className="w-5 h-5" />} label="Hosting" title="Sessions Hosted" value={sessionsHosted} caption="sessions hosted this period" />
        <Counter icon={<IconUserCheck className="w-5 h-5" />} label="Attendance" title="Sessions Attended" value={sessionsAttended} caption="sessions attended this period" />
        <Counter icon={<IconPercentage className="w-5 h-5" />} label="Attendance" title="Attendance Rate" value={rateText(attendance?.summary.rate ?? null)} caption={attendance?.summary.rate == null ? "no sessions marked yet" : `turned up to ${attendance.summary.attended} of ${attendance.summary.attended + attendance.summary.absent} marked`} />
        <Counter icon={<IconUserX className="w-5 h-5" />} label="Attendance" title="No-shows" value={attendance?.summary.noShows ?? 0} caption={attendance?.summary.excused ? `marked absent this period, ${attendance.summary.excused} excused` : "marked absent this period"} />
      </div>
      <Section icon={<IconHistory className="w-5 h-5" />} title="Session History" hint="Sessions hosted and attended this period">
        {loading ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading sessions...</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<IconHistory className="w-7 h-7" />} title="No Sessions" text="No session history has been recorded yet" />
        ) : (
          <ul className="space-y-3">
            {rows.map((s) => {
              const expanded = open.has(s.id);
              const mine = s.users?.find((u: any) => u.userid.toString() === uid);
              const slots: any[] = Array.isArray(s.sessionType.slots) ? s.sessionType.slots : [];
              const role = mine ? slots.find((x) => x.id === mine.roleID) ?? null : null;
              const colour = getSessionTypeColor(s.type);
              return (
                <li key={s.id} className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                  <button type="button" onClick={() => toggle(s.id)} aria-expanded={expanded} className="w-full text-left p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-base font-semibold text-zinc-900 dark:text-white truncate">{s.sessionType.name}</h4>
                        {s.type && <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colour} ${getTextColorForBackground(colour)}`}>{s.type.charAt(0).toUpperCase() + s.type.slice(1)}</span>}
                        {marks.get(s.id) && <Pill colour={TONE[marks.get(s.id)!.status] ?? "grey"}>{marks.get(s.id)!.status.charAt(0).toUpperCase() + marks.get(s.id)!.status.slice(1)}</Pill>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5"><IconCalendarEvent className="w-4 h-4" />{date(s.date)}</span>
                        <span className="flex items-center gap-1.5"><IconClock className="w-4 h-4" />{clock(s.date)}</span>
                        {s.owner && <span className="flex items-center gap-1.5"><IconUser className="w-4 h-4" />Host: {s.owner.username}</span>}
                      </div>
                    </div>
                    {expanded ? <IconChevronUp className="w-5 h-5 text-zinc-500" /> : <IconChevronDown className="w-5 h-5 text-zinc-500" />}
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      {role && <p className="mb-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg text-sm font-medium text-zinc-900 dark:text-white">Your Position: <span className="text-primary">{role.name}</span></p>}
                      <h5 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Participants {s.users?.length > 0 && `(${s.users.length})`}</h5>
                      {s.users?.length > 0 ? <Participants session={s} /> : <p className="text-sm text-zinc-500 dark:text-zinc-400 italic py-2">No participants</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
