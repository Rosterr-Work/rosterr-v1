import { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useRecoilValue } from "recoil";
import { IconArchive, IconBan, IconCheck, IconInbox, IconLoader2, IconSettings, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { STATUSES, STATUS_LABEL, byVotes, type Status } from "@/utils/recommendations/rules";
import Card from "@/components/recommendations/Card";
import Composer from "@/components/recommendations/Composer";
import Settings from "@/components/recommendations/Settings";
import { EmptyState, solidButton } from "@/components/ui/parts";

// Loads from /api/workspace/[id]/recommendations/overview (see utils/recommendations/page.ts); the other tabs from /recommendations?status=.
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }), "view_recommendations");

const TAB_ICON: Record<Status, JSX.Element> = { active: <IconInbox size={16} />, approved: <IconCheck size={16} />, rejected: <IconBan size={16} />, archived: <IconArchive size={16} /> };

const Recommendations: pageWithLayout<{}> = () => {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const me = String(useRecoilValue(loginState).userId ?? "");
  const { data, mutate, error } = useSWR(id ? `/api/workspace/${id}/recommendations/overview` : null, (u: string) => axios.get(u).then((r) => r.data), { revalidateOnFocus: false });

  const [tab, setTab] = useState<Status>("active");
  const [list, setList] = useState<any[] | null>(null); // another tab's list; the first tab comes with the page
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [sort, setSort] = useState(false);

  const shown = tab === "active" && list === null ? data?.recommendations ?? [] : list ?? [];
  const replace = (next: any[]) => (tab === "active" && list === null ? mutate({ ...data, recommendations: next }, { revalidate: false }) : setList(next));

  const open = async (status: Status) => {
    setTab(status);
    setLoading(true);
    try {
      const r = await axios.get(`/api/workspace/${id}/recommendations?status=${status}`);
      setList(r.data.recommendations);
    } catch {
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  if (error?.response?.status === 404) return <div className="pagePadding"><EmptyState icon={<IconInbox size={28} />} title="Recommendations are off" text="An admin can turn them on in Settings." /></div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="pagePadding">
        <Toaster position="bottom-center" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-h2 text-zinc-900 dark:text-white">Recommendations</h1>
          </div>
          <div className="flex items-center gap-2">
            {data?.isAdmin && <button onClick={() => setSettings(true)} title="Recommendation settings" aria-label="Recommendation settings" className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"><IconSettings size={20} /></button>}
            {data?.rights.post && <button className={`${solidButton} px-4 py-2`} onClick={() => setCreating(!creating)}>{creating ? "Cancel" : "New Recommendation"}</button>}
          </div>
        </div>

        {creating && data?.rights.post && (
          <div className="mb-6"><Composer groupId={id!} allowedRanks={data.allowedRanks} onCancel={() => setCreating(false)} onCreated={(rec) => { setCreating(false); if (tab === "active") replace([rec, ...shown]); }} /></div>
        )}

        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 mb-6 overflow-x-auto">
          <div className="flex">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => open(s)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === s ? "border-primary text-primary" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`}>{TAB_ICON[s]} {STATUS_LABEL[s]}</button>
            ))}
          </div>
          <button onClick={() => setSort(!sort)} aria-pressed={sort} className="flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white">{sort ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />} Votes</button>
        </div>

        {!data || loading ? (
          <div className="flex justify-center py-12"><IconLoader2 size={24} className="animate-spin text-zinc-400" /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon={<IconInbox size={28} />} title="No entries found" text={`There are no ${tab} recommendations to display.`} />
        ) : (
          <div className="space-y-4">
            {byVotes(shown, sort).map((rec: any) => (
              <Card key={rec.id} rec={rec} groupId={id!} me={me} rights={data.rights} allowedRanks={data.allowedRanks} currentRank={data.currentRanks[rec.targetUserId]} onChange={(next) => replace(next ? shown.map((r: any) => (r.id === rec.id ? next : r)) : shown.filter((r: any) => r.id !== rec.id))} />
            ))}
          </div>
        )}
      </div>

      {settings && <Settings groupId={id!} allowed={data?.allowedRanks ?? []} onClose={() => setSettings(false)} onSaved={(r) => { mutate({ ...data, allowedRanks: r }, { revalidate: false }); setSettings(false); }} />}
    </div>
  );
};

Recommendations.layout = workspace;

export default Recommendations;
