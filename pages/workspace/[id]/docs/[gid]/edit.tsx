import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import DocForm from "@/components/docs/DocForm";
import { loadDocEdit } from "@/utils/docs/load";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";

export const getServerSideProps = withPermissionCheckSsr(async ({ query, req }) => {
  const props = await loadDocEdit(Number(query.id), String(query.gid), req.session.userid);
  return props ? { props } : { notFound: true };
}, ["edit_docs", "delete_docs"]);

const EditDoc: pageWithLayout<any> = ({ document, roles, departments, rights }) => {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <DocForm key={document.id} groupId={String(router.query.id)} roles={roles} departments={departments} doc={document} canEdit={rights.edit} canDelete={rights.remove} />
    </div>
  );
};

EditDoc.layout = Workspace;
export default EditDoc;
