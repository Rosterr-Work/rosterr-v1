import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import DocsHome from "@/components/docs/DocsHome";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const DocsPage: pageWithLayout = () => {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      {router.isReady && <DocsHome groupId={String(router.query.id)} />}
    </div>
  );
};

DocsPage.layout = Workspace;
export default DocsPage;
