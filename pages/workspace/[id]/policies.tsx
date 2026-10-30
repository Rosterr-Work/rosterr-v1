import { useState } from "react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import useSWR from "swr";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import { IconSettings, IconUser } from "@tabler/icons-react";
import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import Workspace from "@/layouts/workspace";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import ManagePolicies from "@/components/policies/ManagePolicies";
import MyPolicies from "@/components/policies/MyPolicies";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const tab = (on: boolean) => `flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${on ? "border-primary text-primary" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`;
const fetcher = (url: string) => axios.get(url).then((r) => r.data);

const PoliciesPage: pageWithLayout = () => {
  const router = useRouter();
  const groupId = String(router.query.id);
  const login = useRecoilValue(loginState);
  const [mode, setMode] = useState<"mine" | "manage">("mine");
  // Whether the page is on, and whether this person may manage; the list itself loads when Manage is opened.
  const { data, error } = useSWR(router.isReady ? `/api/workspace/${groupId}/policies/overview` : null, fetcher, { shouldRetryOnError: false });
  const canManage = Boolean(data?.rights && (data.rights.create || data.rights.edit || data.rights.remove || data.rights.compliance));

  if (error?.response?.status === 404) return <div className="pagePadding text-sm text-zinc-500 dark:text-zinc-400">Policies aren't turned on for this workspace.</div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <div className="pagePadding">
        <h1 className="text-h2 text-zinc-900 dark:text-white">Policies</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{mode === "mine" ? "Review and agree to the policies that are for you" : "Manage the workspace's policies and see who has agreed"}</p>
        <div className="mt-4 flex border-b border-zinc-200 dark:border-zinc-700">
          <button onClick={() => setMode("mine")} className={tab(mode === "mine")}><IconUser className="w-4 h-4" /> My policies</button>
          {canManage && <button onClick={() => setMode("manage")} className={tab(mode === "manage")}><IconSettings className="w-4 h-4" /> Manage policies</button>}
        </div>
        {router.isReady && mode === "mine" && <MyPolicies groupId={groupId} username={login.username} />}
        {router.isReady && mode === "manage" && canManage && <ManagePolicies groupId={groupId} />}
      </div>
    </div>
  );
};

PoliciesPage.layout = Workspace;
export default PoliciesPage;
