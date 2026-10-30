import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useRecoilValue } from "recoil";
import { IconPlus, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { workspacestate } from "@/state";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";
import { moderationPlaceOptions } from "@/utils/moderationPlaces";
import { actionLabel, pageNumbers, showing } from "@/utils/moderation/cases-ui";
import CaseList, { CaseListSkeleton, type CaseItem } from "@/components/moderation/CaseList";
import ModerationStats from "@/components/moderation/ModerationStats";
import type { Overview } from "@/utils/moderation/overview";
import CreateCase from "@/components/moderation/CreateCase";
import { Dialog, dangerButton, ghostButton, inputClass, solidButton } from "@/components/ui/parts";

type Game = { name: string; id: number };

export const getServerSideProps = withPermissionCheckSsr(async ({ params }) => {
  const groupId = BigInt(params?.id as string);
  if (!(await getConfig("moderation", groupId))?.enabled) return { notFound: true };
  return { props: { games: await moderationPlaceOptions(groupId) } };
}, ["view_moderation"]);

const PER_PAGE = 20;

const ModerationDashboard: pageWithLayout<{ games: Game[] }> = ({ games }) => {
  const router = useRouter();
  const groupId = router.query.id as string;
  const me = useRecoilValue(workspacestate);
  const can = (p: string) => Boolean(me.isAdmin || me.yourPermission?.includes(p));
  const rights = { execute: can("execute_punishments"), revoke: can("revoke_punishments"), remove: can("delete_moderation_cases") };

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState<Overview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [revoking, setRevoking] = useState<CaseItem | null>(null);
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState<CaseItem | null>(null);
  const [busy, setBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (p: number, q: string, s: string) => {
      if (!groupId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) });
        if (q.trim()) params.set("search", q.trim());
        if (s !== "all") params.set("status", s);
        const { data } = await axios.get(`/api/workspace/${groupId}/moderation/cases?${params}`);
        if (data.success) {
          setCases(data.data.cases);
          setPage(data.data.pagination.page);
          setPages(data.data.pagination.pages);
          setTotal(data.data.pagination.total);
        }
      } catch {
        toast.error("Failed to refresh cases");
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [groupId],
  );

  const loadStats = useCallback(() => {
    if (groupId) axios.get(`/api/workspace/${groupId}/moderation/stats`).then((r) => r.data.success && setStats(r.data.data)).catch(() => {});
  }, [groupId]);
  useEffect(() => void load(1, "", "all"), [load]);
  useEffect(loadStats, [loadStats]);

  const reload = () => {
    loadStats();
    return load(page, search, status);
  };
  const typeSearch = (v: string) => {
    setSearch(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, v, status), 400);
  };

  const create = async (body: any) => {
    try {
      const { data } = await axios.post(`/api/workspace/${groupId}/moderation/cases`, body);
      if (data.success) {
        toast.success("Case created successfully");
        setCreating(false);
        loadStats();
        load(1, search, status);
      }
    } catch {
      toast.error("Failed to create case");
    }
  };

  const run = async (request: () => Promise<any>, ok: (r: any) => string, fail: string) => {
    try {
      const r = await request();
      if (r.data.success) {
        toast.success(ok(r));
        reload();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || fail);
    }
  };

  const ban = (c: CaseItem) => run(() => axios.post(`/api/workspace/${groupId}/moderation/bans`, { userId: c.targetUserId, username: c.targetUsername, reason: c.reason, duration: c.banDuration, expiresAt: c.expiresAt, isPermanent: c.isPermanent, caseId: c.id }), (r) => r.data.data.message, "Failed to execute ban");
  const kick = (c: CaseItem) => run(() => axios.post(`/api/workspace/${groupId}/moderation/cases/${c.id}/execute-kick`), () => "Kick executed successfully", "Failed to execute kick");

  const revoke = async () => {
    if (!revoking || !reason.trim()) return void toast.error("Please provide a reason for revocation");
    setBusy(true);
    await run(() => axios.post(`/api/workspace/${groupId}/moderation/cases/${revoking.id}/revoke`, { reason }), () => "Case action revoked successfully", "Failed to revoke case action");
    setBusy(false);
    setRevoking(null);
    setReason("");
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    await run(() => axios.delete(`/api/workspace/${groupId}/moderation/cases/${removing.id}`), () => "Case deleted successfully", "Failed to delete case.");
    setBusy(false);
    setRemoving(null);
  };

  const pageButton = "inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
  const go = (p: number) => p >= 1 && p <= pages && !loading && load(p, search, status);
  const pick = (v: string) => {
    setStatus(v);
    load(1, search, v);
  };
  const TABS: [string, string, number | null][] = [
    ["all", "All", stats?.total ?? null],
    ["open", "Open", stats?.open ?? null],
    ["appealed", "Appealed", stats?.appealed ?? null],
    ["resolved", "Resolved", stats?.resolved ?? null],
    ["revoked", "Revoked", stats?.revoked ?? null],
  ];

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h2 text-zinc-900 dark:text-white">Moderation</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Cases against players: warnings, kicks and bans, with the evidence and the outcome.</p>
        </div>
        {can("create_moderation_cases") && (
          <button type="button" onClick={() => setCreating(true)} className={solidButton}>
            <IconPlus size={18} />
            New case
          </button>
        )}
      </div>

      <div className="mb-6"><ModerationStats data={stats} onOpen={() => pick("open")} /></div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Case status" className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {TABS.map(([value, label, n]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={status === value}
              onClick={() => pick(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${status === value ? "bg-primary text-white" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"}`}
            >
              {label}
              {n !== null && <span className={`ml-1.5 text-xs tabular-nums ${status === value ? "opacity-80" : "text-zinc-400"}`}>{n}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input className={`${inputClass} pl-10`} placeholder="Search by player or reason" value={search} onChange={(e) => typeSearch(e.target.value)} aria-label="Search cases" />
          </div>
          <button type="button" onClick={reload} disabled={loading} aria-label="Refresh" title="Refresh" className={`${ghostButton} px-2.5`}>
            <IconRefresh size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {!loaded ? (
        <CaseListSkeleton />
      ) : (
        <CaseList cases={cases} groupId={groupId} rights={rights} onCreate={can("create_moderation_cases") ? () => setCreating(true) : undefined} filtered={status !== "all" || Boolean(search.trim())} onRevoke={setRevoking} onBan={ban} onKick={kick} onDelete={setRemoving} />
      )}

      {pages > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 px-1 sm:flex-row">
          <p className="order-2 text-sm text-zinc-500 dark:text-zinc-400 sm:order-1">{showing(page, PER_PAGE, total)}</p>
          <div className="order-1 flex items-center gap-1 sm:order-2">
            <button type="button" onClick={() => go(page - 1)} disabled={page === 1 || loading} className={pageButton}>Previous</button>
            {pageNumbers(page, pages).map((p, i) =>
              p === "..." ? (
                <span key={`gap-${i}`} className="px-2 text-sm text-zinc-400">…</span>
              ) : (
                <button key={p} type="button" onClick={() => go(p)} disabled={loading} aria-current={p === page ? "page" : undefined} className={`${pageButton} min-w-9 tabular-nums ${p === page ? "!border-primary !bg-primary !text-white" : ""}`}>{p}</button>
              )
            )}
            <button type="button" onClick={() => go(page + 1)} disabled={page >= pages || loading} className={pageButton}>Next</button>
          </div>
        </div>
      )}

      {creating && <CreateCase workspaceId={groupId} games={games} canManageTemplates={can("manage_moderation_templates")} onSubmit={create} onCancel={() => setCreating(false)} />}

      {revoking && (
        <Dialog title="Revoke action" onClose={() => setRevoking(null)} actions={<><button className={ghostButton} disabled={busy} onClick={() => setRevoking(null)}>Cancel</button><button className={solidButton} disabled={busy || !reason.trim()} onClick={revoke}>{busy ? "Revoking…" : "Revoke action"}</button></>}>
          <div className="text-left">
            <p className="mb-3">This will revoke the {actionLabel(revoking.action).toLowerCase()} action for <span className="font-medium">{revoking.targetUsername}</span>. Please provide a reason for the revocation.</p>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Revocation Reason <span className="text-red-500">*</span></label>
            <textarea className={`${inputClass} resize-none`} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this action is being revoked..." />
          </div>
        </Dialog>
      )}

      {removing && (
        <Dialog title="Delete case" onClose={() => setRemoving(null)} actions={<><button className={ghostButton} disabled={busy} onClick={() => setRemoving(null)}>Cancel</button><button className={dangerButton} disabled={busy} onClick={remove}><IconTrash size={16} className="inline mr-1" />{busy ? "Deleting..." : "Delete Case"}</button></>}>
          <p className="mb-3">Are you sure you want to permanently delete this case? This will also remove any linked bans and evidence. This action cannot be undone.</p>
          <div className="text-left bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
            <div className="font-medium text-zinc-900 dark:text-white mb-1">{removing.targetUsername || `User ${removing.targetUserId}`}</div>
            <div className="text-sm line-clamp-2">{removing.reason}</div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

ModerationDashboard.layout = workspace;

export default ModerationDashboard;
