import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import SessionForm from "@/components/sessions/SessionForm";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { loadNewForm } from "@/utils/sessions/formpage";

export const getServerSideProps = withPermissionCheckSsr(async ({ query, req }) => {
  const props = await loadNewForm(Number(query.id), req.session.userid);
  return props ? { props } : { notFound: true };
});

const NewSession: pageWithLayout<any> = ({ kinds, games, templates }) => {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <SessionForm groupId={String(router.query.id)} kinds={kinds} games={games} templates={templates} />
    </div>
  );
};

NewSession.layout = Workspace;
export default NewSession;
