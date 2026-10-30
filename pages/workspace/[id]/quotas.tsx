import { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import axios from "axios";
import { useRecoilValue } from "recoil";
import { Toaster } from "react-hot-toast";
import { IconClipboardList, IconTarget } from "@tabler/icons-react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import ManageQuotas from "@/components/quotas/ManageQuotas";
import MyQuotas from "@/components/quotas/MyQuotas";

// The quotas page loads from /api/workspace/[id]/activity/quotas (see utils/quotas/load.ts).
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const tab = (on: boolean) => `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${on ? "border-primary text-primary" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`;

const Quotas: pageWithLayout<{}> = () => {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const login = useRecoilValue(loginState);
  const { data, mutate } = useSWR(id ? `/api/workspace/${id}/activity/quotas` : null, (u: string) => axios.get(u).then((r) => r.data), { revalidateOnFocus: false });
  const [view, setView] = useState<"mine" | "manage">("mine");

  const canManage = Boolean(data?.canManageQuotas);
  const canDelete = Boolean(data?.canDeleteQuotas);
  const manager = canManage || canDelete;
  const set = (key: "myQuotas" | "allQuotas") => (next: any[]) => mutate({ ...data, [key]: next }, { revalidate: false });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="pagePadding">
        <Toaster position="bottom-center" />
        <div className="mb-6">
          <h1 className="text-h2 text-zinc-900 dark:text-white">Quotas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{view === "mine" || !manager ? "Track your activity progress" : "Manage quotas for your workspace"}</p>
        </div>

        {manager && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-6">
            <button onClick={() => setView("mine")} className={tab(view === "mine")}><IconTarget className="w-4 h-4" /> My Quotas</button>
            <button onClick={() => setView("manage")} className={tab(view === "manage")}><IconClipboardList className="w-4 h-4" /> Manage Quotas</button>
          </div>
        )}

        {!data ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading quotas…</p>
        ) : !manager || view === "mine" ? (
          <MyQuotas quotas={data.myQuotas} groupId={id!} userId={login.userId} onChange={set("myQuotas")} />
        ) : (
          <ManageQuotas groupId={id!} quotas={data.allQuotas} roles={data.roles} departments={data.departments} canManage={canManage} canDelete={canDelete} recommendationsEnabled={Boolean(data.recommendationsEnabled)} onChange={set("allQuotas")} />
        )}
      </div>
    </div>
  );
};

Quotas.layout = workspace;

export default Quotas;
