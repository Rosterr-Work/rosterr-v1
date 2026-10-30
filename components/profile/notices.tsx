import { useState } from "react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import axios from "axios";
import moment from "moment";
import toast from "react-hot-toast";
import { IconBook, IconBug, IconCalendarTime, IconCheck, IconClock, IconHome, IconPlus, IconX } from "@tabler/icons-react";
import { workspacestate } from "@/state";
import { dangerButton, ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import { fmtDate } from "@/utils/formatDate";
import { NOTICE_KINDS, STATUS_TEXT, canRevoke, noticeStatus, recordProblem, type NoticeKind } from "@/utils/profile/notices";
import ImportedTag from "@/components/ui/ImportedTag";

type Props = { notices: any[]; canManageNotices?: boolean; canApproveNotices?: boolean; canRecordNotices?: boolean; userId?: string };

const KIND_ICON: Record<NoticeKind, JSX.Element> = {
  holiday: <IconCalendarTime className="w-4 h-4" />,
  sickness: <IconBug className="w-4 h-4" />,
  personal: <IconHome className="w-4 h-4" />,
  school: <IconBook className="w-4 h-4" />,
  other: <IconPlus className="w-4 h-4" />,
};
const STATUS_ICON = {
  approved: <IconCheck className="w-5 h-5 text-emerald-500" />,
  revoked: <IconX className="w-5 h-5 text-red-500" />,
  declined: <IconX className="w-5 h-5 text-red-500" />,
  review: <IconClock className="w-5 h-5 text-amber-500" />,
};
const day = (d: string) => fmtDate(d);
const CHIP = {
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  revoked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  declined: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
} as const;

export default function Notices({ notices, canManageNotices = false, canApproveNotices = false, canRecordNotices = false, userId }: Props) {
  const router = useRouter();
  const workspace = useRecoilValue(workspacestate);
  const groupId = router.query.id ?? workspace.groupId;
  const [list, setList] = useState<any[]>(notices || []);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<NoticeKind | "">("");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAdding(false);
    setKind("");
    setReason("");
    setStart("");
    setEnd("");
  };

  const record = async () => {
    const problem = recordProblem({ reason, start, end });
    if (problem || !userId) return void toast.error(problem ?? "Please fill in all fields");
    setSaving(true);
    try {
      const s = new Date(start);
      const e = new Date(end);
      const { data } = await axios.post(`/api/workspace/${groupId}/activity/notices/record`, { userId, startTime: s.getTime(), endTime: e.getTime(), reason: reason.trim() });
      if (data.success) {
        toast.success("Notice recorded");
        setList((p) => [{ id: data.notice.id, reason: reason.trim(), startTime: s.toISOString(), endTime: e.toISOString(), approved: true, reviewed: true, revoked: false }, ...p]);
        reset();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record notice");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (n: any) => {
    try {
      await axios.post(`/api/workspace/${groupId}/activity/notices/update`, { id: n.id, status: "cancel" });
      setList((p) => p.map((x) => (x.id === n.id ? { ...x, revoked: true, revokedAt: new Date().toISOString() } : x)));
      toast.success("Notice revoked");
    } catch {
      toast.error("Failed to revoke notice");
    }
  };

  const pending = list.filter((n) => !n.reviewed).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-h3 text-zinc-900 dark:text-white">Leave and inactivity</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Time off this member has asked for, or that has been recorded for them.</p>
        </div>
        {canRecordNotices && !adding && <button onClick={() => setAdding(true)} className={solidButton}><IconPlus className="w-4 h-4" /> Add record</button>}
      </div>

      {canRecordNotices && adding && (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-700/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Create Notices Record</h3>
            <button onClick={reset} aria-label="Close" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"><IconX className="w-4 h-4" /></button>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Type</p>
            <div className="flex gap-2 flex-wrap">
              {NOTICE_KINDS.map((k) => (
                <button key={k.value} type="button" aria-pressed={kind === k.value} onClick={() => { setKind(k.value); setReason(k.reason); }} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 ${kind === k.value ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}>
                  {KIND_ICON[k.value]} {k.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date<input type="date" className={`${inputClass} mt-2`} value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date<input type="date" className={`${inputClass} mt-2`} value={end} min={start || moment().format("YYYY-MM-DD")} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          {kind !== "" && (
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reason for Inactivity
              {kind === "other" ? (
                <textarea className={`${inputClass} mt-2 resize-none`} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Please provide a brief explanation for the inactivity period..." />
              ) : (
                <div className={`${inputClass} mt-2`}>{NOTICE_KINDS.find((k) => k.value === kind)?.label}</div>
              )}
            </label>
          )}
          <div className="flex gap-2">
            <button onClick={record} disabled={saving || !reason.trim() || !start || !end} className={solidButton}>{saving ? "Adding..." : "Add Record"}</button>
            <button onClick={reset} className={ghostButton}>Cancel</button>
          </div>
        </div>
      )}

      {(canApproveNotices || canManageNotices) && pending > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md flex items-center justify-between">
          <span className="text-sm text-amber-800 dark:text-amber-300">{pending} pending notice(s) for this user</span>
          <button onClick={() => router.push(`/workspace/${router.query.id}/notices`)} className="px-3 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-sm">Manage</button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">No leave notices for this member.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((n) => {
            const status = noticeStatus(n);
            return (
              <li key={n.id} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800 sm:flex-row sm:gap-4 sm:p-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="shrink-0">{STATUS_ICON[status]}</div>
                  <div className="grow min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIP[status]}`}>{STATUS_TEXT[status]}</span>
                      <span className="text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-200 whitespace-nowrap">{day(n.startTime)} to {day(n.endTime)}</span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 break-words">{n.reason}</p>
                    <ImportedTag record={n} className="mb-2" />
                    <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {n.createdAt && <span>Created {day(n.createdAt)}</span>}
                      {n.approvedAt && !n.revoked && <span>{n.approved ? "Approved" : "Reviewed"}{n.reviewedByUsername ? ` by ${n.reviewedByUsername}` : ""} {day(n.approvedAt)}</span>}
                      {n.revoked && <span className="text-red-400">Revoked{n.revokedByUsername ? ` by ${n.revokedByUsername}` : ""}{n.revokedAt ? ` ${day(n.revokedAt)}` : ""}</span>}
                    </div>
                  </div>
                </div>
                {canManageNotices && canRevoke(n) && (
                  <div className="shrink-0">
                    <button onClick={() => revoke(n)} className={`${dangerButton} w-full sm:w-auto`}>Revoke</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
