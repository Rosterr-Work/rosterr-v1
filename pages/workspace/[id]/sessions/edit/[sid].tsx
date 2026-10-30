import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import SessionForm from "@/components/sessions/SessionForm";
import { isScope } from "@/utils/sessions/scope";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { loadEditForm } from "@/utils/sessions/formpage";

export const getServerSideProps = withPermissionCheckSsr(async ({ query, req }) => {
  const props = await loadEditForm(Number(query.id), req.session.userid, String(query.sid));
  return props ? { props } : { notFound: true };
});

const EditSession: pageWithLayout<any> = ({ session, games, templates }) => {
  const router = useRouter();
  const scope = typeof router.query.scope === "string" && isScope(router.query.scope) ? router.query.scope : undefined;
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <SessionForm key={session.id} groupId={String(router.query.id)} session={session} scope={scope} games={games} templates={templates} />
    </div>
  );
};

EditSession.layout = Workspace;
export default EditSession;
