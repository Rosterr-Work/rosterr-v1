import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { IconBriefcase, IconChartBar, IconCheck, IconUsers } from "@tabler/icons-react";
import { pillStyle } from "@/utils/theme";
import { EmptyState, Section } from "@/components/ui/parts";
import { canUncomplete, customAction, quotaPercentage, quotaText, type QuotaStats } from "@/utils/profile/quota";
import { fmtDate } from "@/utils/formatDate";
import type { SessionCounts, ViewedPerson } from "@/utils/profile/props";

type Props = SessionCounts &
  ViewedPerson & {
    quotas: any[];
    displayMinutes: number;
    workspaceId?: string;
    isHistorical?: boolean;
    periodEnd?: string;
  };

const done = (q: any) => ({ ...q, completed: true, completedAt: new Date(), percentage: 100 });
const undone = (q: any) => ({ ...q, completed: false, completedAt: null, completedBy: null, completedByUser: null, completionNotes: null });

export function QuotasProgress(p: Props) {
  const { quotas, canSignoffQuotas = false, targetUserId, isViewingOwnProfile = false, workspaceId, isHistorical = false, periodEnd } = p;
  const stats: QuotaStats = {
    minutes: p.displayMinutes,
    hosted: p.sessionsHosted,
    secondaryHosted: p.sessionsSecondaryHosted,
    attended: p.sessionsAttended,
    allianceVisits: p.allianceVisits,
    recommendationSubmissions: p.recommendationSubmissions ?? 0,
    recommendationVotes: p.recommendationVotes ?? 0,
  };
  const [list, setList] = useState(quotas);
  // A different period or a different set of quotas starts the list over.
  const key = `${isHistorical ? "h" : "c"}:${periodEnd ?? ""}:${quotas.map((q) => q.id).join(",")}`;
  const last = useRef("");
  useEffect(() => {
    if (key !== last.current) {
      last.current = key;
      setList(quotas);
    }
  }, [key, quotas]);

  const viewer = { own: isViewingOwnProfile, canSignoff: canSignoffQuotas, historical: isHistorical };
  const act = (quota: any, path: "complete" | "signoff" | "uncomplete", messages: { loading: string; success: string; error: string }) => {
    const body = { targetUserId, ...(path === "signoff" && isHistorical && periodEnd ? { periodEnd } : {}) };
    const request = axios.post(`/api/workspace/${workspaceId}/activity/quotas/${quota.id}/${path}`, body).then(() => setList((prev) => prev.map((q) => (q.id === quota.id ? (path === "uncomplete" ? undone(q) : done(q)) : q))));
    toast.promise(request, messages);
  };

  if (list.length === 0) return <EmptyState icon={<IconChartBar className="w-7 h-7" />} title="No Quotas" text="No activity quotas have been assigned yet" />;

  return (
    <Section icon={<IconChartBar className="w-5 h-5" />} title="Activity Quotas" hint="Track how this member is progressing against their targets">
      <div className="grid gap-4">
        {list.map((q) => {
          const pct = quotaPercentage(q, stats, isHistorical) || 0;
          const action = q.type === "custom" && !q.completed && workspaceId && targetUserId ? customAction(q, viewer) : null;
          return (
            <div key={q.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">{q.name}</h3>
              {q.sessionType && q.sessionType !== "all" && <p className="text-xs text-primary mb-1">Session type: {q.sessionType.charAt(0).toUpperCase() + q.sessionType.slice(1)}</p>}
              {q.linkedVia && q.linkedName && (
                <span className="inline-flex items-center gap-1 text-white py-1 px-2 rounded-full text-xs font-medium mb-2" style={pillStyle(q.linkedColor, "#6b7280")}>
                  {q.linkedVia === "role" ? <IconUsers className="w-3 h-3" /> : <IconBriefcase className="w-3 h-3" />} {q.linkedName}
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Progress</span>
                {q.type !== "custom" ? (
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">{quotaText(q, stats, isHistorical)}</span>
                ) : q.completed ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium"><IconCheck className="w-4 h-4" /> Completed</span>
                ) : (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 italic">Not completed</span>
                )}
              </div>

              {q.type !== "custom" && (
                <>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-600 rounded-full h-3" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-3 rounded-full rr-grow ${pct >= 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{pct.toFixed(0)}% complete</p>
                </>
              )}

              {q.type === "custom" && q.completed && (
                <div className="mt-2 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {q.completedAt && <p>Completed on {fmtDate(new Date(q.completedAt))}</p>}
                  {q.completedByUser && <p>Signed off by @{q.completedByUser.username}</p>}
                  {workspaceId && targetUserId && canUncomplete(q, viewer) && (
                    <button onClick={() => act(q, "uncomplete", { loading: "Marking as incomplete...", success: "Quota marked as incomplete", error: "Failed to mark as incomplete" })} className="hover:text-primary transition-colors">Mark as incomplete</button>
                  )}
                </div>
              )}

              {action?.kind === "complete" && (
                <button onClick={() => act(q, "complete", { loading: "Marking as complete...", success: "Quota completed", error: "Failed to complete quota" })} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded"><IconCheck className="w-3.5 h-3.5" /> {action.label}</button>
              )}
              {action?.kind === "signoff" && (
                <button onClick={() => act(q, "signoff", { loading: "Signing off quota...", success: "Quota signed off", error: "Failed to sign off quota" })} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"><IconCheck className="w-3.5 h-3.5" /> {action.label}</button>
              )}
              {action?.kind === "hint" && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 italic">{action.text}</p>}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
