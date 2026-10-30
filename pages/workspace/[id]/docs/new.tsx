import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import DocForm from "@/components/docs/DocForm";
import { loadDocNew } from "@/utils/docs/load";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";

export const getServerSideProps = withPermissionCheckSsr(async ({ query }) => ({ props: await loadDocNew(Number(query.id)) }), "create_docs");

const NewDoc: pageWithLayout<{ roles: any[]; departments: any[] }> = ({ roles, departments }) => {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <DocForm groupId={String(router.query.id)} roles={roles} departments={departments} folderId={typeof router.query.containerId === "string" ? router.query.containerId : undefined} />
    </div>
  );
};

NewDoc.layout = Workspace;
export default NewDoc;
