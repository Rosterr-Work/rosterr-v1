import type { pageWithLayout } from "@/layoutTypes";
import type { GetServerSideProps } from "next";
import Workspace from "@/layouts/workspace";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { workspacestate } from "@/state";
import { useCallback, useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import { IconExternalLink, IconInbox, IconPlugConnected } from "@tabler/icons-react";
import StatusBadge from "@/components/staffr/StatusBadge";
import { APPLICATION_STATUSES, STATUS_LABEL } from "@/utils/staffr/constants";
import type { StaffrApplication, StaffrJob, StaffrPagination } from "@/utils/staffr/types";
import { fmtDateTime } from "@/utils/formatDate";
import { staffrClosed } from "@/utils/staffr/closure";

// From the day Staffr closes, this list is gone and Hiring is where applications are.
export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async ({ query }) => (staffrClosed() ? { redirect: { destination: `/workspace/${query.id}/hiring/applications`, permanent: false } } : { props: {} }), "applications.view");

const PAGE_SIZE = 25;

const Applications: pageWithLayout = () => {
  const router = useRouter();
  const [workspace] = useRecoilState(workspacestate);
  const groupId = router.query.id;

  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<StaffrApplication[] | null>(null);
  const [pagination, setPagination] = useState<StaffrPagination | null>(null);
  const [jobs, setJobs] = useState<StaffrJob[]>([]);
  const [notConnected, setNotConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<{ name: string; slug: string } | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [closesAt, setClosesAt] = useState<string | null>(null);

  const isAdmin = Boolean(workspace?.isAdmin);

  const load = useCallback(async () => {
    if (!groupId) return;
    setError(null);
    try {
      const { data } = await axios.get(`/api/workspace/${groupId}/staffr/applications`, {
        params: { status: status || undefined, job_id: jobId || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      setItems(data.data);
      setPagination(data.pagination);
      setNotConnected(false);
    } catch (e: any) {
      if (e.response?.data?.code === "not_connected") setNotConnected(true);
      else setError(e.response?.data?.error || "Couldn't load applications.");
      setItems([]);
    }
  }, [groupId, status, jobId, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Job filter and the Staffr group's name, once. Both are optional extras: the list works without them.
  useEffect(() => {
    if (!groupId) return;
    axios.get(`/api/workspace/${groupId}/staffr/jobs`).then((r) => setJobs(r.data.data ?? [])).catch(() => {});
    axios.get(`/api/workspace/${groupId}/staffr/hires`, { params: { status: "READY", limit: 1 } }).then((r) => setWaiting(r.data.counts?.READY ?? 0)).catch(() => {});
    axios.get(`/api/workspace/${groupId}/settings/staffr`).then((r) => { if (r.data.status?.group) setGroup(r.data.status.group); setClosesAt(r.data.closure?.state === "closing" ? r.data.closure.closesAt : null); }).catch(() => {});
  }, [groupId]);

  const pick = (fn: () => void) => {
    fn();
    setPage(0);
  };

  if (notConnected) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <IconPlugConnected className="mx-auto text-zinc-400" size={36} />
          <h1 className="mt-3 text-h3 text-zinc-900 dark:text-zinc-100">Applications come from Staffr</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Connect this workspace to your Staffr group to review job applications here.
          </p>
          {isAdmin ? (
            <Link
              href={`/workspace/${groupId}/settings?section=integrations`}
              className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Connect Staffr
            </Link>
          ) : (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Ask a workspace admin to connect Staffr in Settings.</p>
          )}
        </div>
      </div>
    );
  }

  const total = pagination?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Toaster position="bottom-center" />
      {closesAt && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Staffr closes on {fmtDateTime(new Date(closesAt))}. Your jobs and applications are coming to <Link href={`/workspace/${groupId}/hiring`} className="underline">Hiring</Link>, which already works.
        </div>
      )}
      <div className="mb-2 flex gap-4 text-sm">
        <span className="border-b-2 border-primary pb-1 font-medium text-primary">All applications</span>
        <Link href={`/workspace/${groupId}/applications/hires`} className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
          Onboarding
          {waiting > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-zinc-900">{waiting}</span>}
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 text-zinc-900 dark:text-zinc-100">Applications</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {group ? `From ${group.name} on Staffr.` : "From Staffr."}
          </p>
        </div>
        {group && (
          <a
            href={`https://rosterr.cc`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Open Staffr <IconExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["", ...APPLICATION_STATUSES].map((s) => (
          <button
            key={s || "all"}
            onClick={() => pick(() => setStatus(s))}
            className={`rounded-full px-3 py-1.5 text-sm ${
              status === s
                ? "bg-primary/10 font-medium text-primary"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {s ? STATUS_LABEL[s] : "All"}
          </button>
        ))}
        {jobs.length > 0 && (
          <select
            value={jobId}
            onChange={(e) => pick(() => setJobId(e.target.value))}
            className="ml-auto rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
          >
            <option value="">All roles</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}{" "}
          {isAdmin && (
            <Link href={`/workspace/${groupId}/settings?section=integrations`} className="underline">
              Check the Staffr connection
            </Link>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-zinc-500">
                  Loading…
                </td>
              </tr>
            )}
            {items?.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  <IconInbox className="mx-auto mb-2 text-zinc-400" size={28} />
                  No applications{status || jobId ? " match those filters" : " yet"}.
                </td>
              </tr>
            )}
            {items?.map((a) => (
              <tr
                key={a.id}
                onClick={() => router.push(`/workspace/${groupId}/applications/${a.id}`)}
                className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-700/60 dark:hover:bg-zinc-700/30"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{a.applicant?.roblox_username || a.applicant?.name || "Unknown"}</p>
                  {a.applicant?.name && a.applicant.name !== a.applicant.roblox_username && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{a.applicant.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-zinc-800 dark:text-zinc-200">{a.job?.title ?? "—"}</p>
                  {a.job?.department && <p className="text-xs text-zinc-500 dark:text-zinc-400">{a.job.department}</p>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">{fmtDateTime(new Date(a.updated_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            {total.toLocaleString("en-GB")} applications · page {page + 1} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
            <button
              disabled={!pagination.has_more}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

Applications.layout = Workspace;
export default Applications;
