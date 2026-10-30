import { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import MyNotices from "@/components/notices/MyNotices";
import RequestForm from "@/components/notices/RequestForm";
import TeamNotices from "@/components/notices/TeamNotices";

// Loads from /api/workspace/[id]/activity/notices/overview (see utils/notices/overview.ts).
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const tab = (on: boolean) => `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${on ? "border-primary text-primary" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`;

const Notices: pageWithLayout<{}> = () => {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const { data, mutate } = useSWR(id ? `/api/workspace/${id}/activity/notices/overview` : null, (u: string) => axios.get(u).then((r) => r.data), { revalidateOnFocus: false });
  const [view, setView] = useState<"mine" | "team">("mine");
  const reviewer = Boolean(data && (data.canApprove || data.canManage));

  const update = async (noticeId: string, status: "approve" | "deny" | "cancel") => {
    try {
      const { data: r } = await axios.post(`/api/workspace/${id}/activity/notices/update`, { id: noticeId, status });
      if (r.success) {
        toast.success("Notice updated");
        mutate();
      }
    } catch {
      toast.error("Failed to update notice");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="pagePadding">
        <Toaster position="bottom-center" />
        <div className="mb-6">
          <h1 className="text-h2 text-zinc-900 dark:text-white">Notices</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{view === "mine" || !reviewer ? "Manage your inactivity notices" : "Review and manage team notices"}</p>
        </div>

        {reviewer && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-6">
            <button className={tab(view === "mine")} onClick={() => setView("mine")}>My Notices</button>
            <button className={tab(view === "team")} onClick={() => setView("team")}>Manage Notices</button>
          </div>
        )}

        {!data ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading notices…</p>
        ) : !reviewer || view === "mine" ? (
          <div className="space-y-8">
            <MyNotices
              groupId={id!}
              away={data.awayToday}
              mine={data.mine}
              reviewerMap={data.reviewerMap}
              form={data.canCreate ? <RequestForm groupId={id!} onSent={() => mutate()} /> : <p className="text-sm text-zinc-600 dark:text-zinc-400">You don&apos;t have permission to create notices.</p>}
            />
          </div>
        ) : (
          <TeamNotices groupId={id!} team={data.team} reviewerMap={data.reviewerMap} canManage={data.canManage} onUpdate={update} />
        )}
      </div>
    </div>
  );
};

Notices.layout = workspace;

export default Notices;
