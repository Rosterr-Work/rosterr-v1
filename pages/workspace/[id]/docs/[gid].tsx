import { useRouter } from "next/router";
import { IconArrowLeft, IconClock, IconExternalLink, IconPencil } from "@tabler/icons-react";
import { Toaster } from "react-hot-toast";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import DocBody from "@/components/docs/DocBody";
import { useLinkGate } from "@/components/docs/LinkGate";
import { Avatar, ghostButton, solidButton } from "@/components/ui/parts";
import { loadDocView } from "@/utils/docs/load";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { fmtDateTime } from "@/utils/formatDate";

export const getServerSideProps = withPermissionCheckSsr(async ({ query, req }) => {
  const props = await loadDocView(Number(query.id), String(query.gid), req.session.userid);
  return props ? { props } : { notFound: true };
});

const DocPage: pageWithLayout<{ document: any; rights: { edit: boolean } }> = ({ document, rights }) => {
  const router = useRouter();
  const groupId = String(router.query.id);
  const gate = useLinkGate();
  const elsewhere = Boolean(document.content?.external);

  return (
    <div className="pagePadding">
      <Toaster position="bottom-center" />
      <div className="mb-8">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.push(`/workspace/${groupId}/docs`)} aria-label="Back to documents" className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><IconArrowLeft className="w-5 h-5 text-zinc-500" /></button>
          <h1 className="flex-1 text-h1 text-zinc-900 dark:text-white">{document.name}</h1>
          {rights.edit && <button onClick={() => router.push(`/workspace/${groupId}/docs/${document.id}/edit`)} className={ghostButton}><IconPencil className="w-4 h-4" /> Edit</button>}
        </div>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <span className="flex items-center gap-2">
            <Avatar src={document.owner?.picture || "/default-avatar.jpg"} userId={document.owner?.userid ?? ""} size={20} alt={`${document.owner?.username}'s avatar`} />
            Created by {document.owner?.username}
          </span>
          <span className="flex items-center gap-2"><IconClock className="w-4 h-4" /> Last updated {fmtDateTime(new Date(document.updatedAt))}</span>
        </div>
      </div>
      <div className="rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm sm:p-6 md:p-8">
        {elsewhere ? (
          <div className="text-center">
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">This document is hosted somewhere else.</p>
            <button onClick={() => gate.open(document.content.url)} className={solidButton}><IconExternalLink className="w-4 h-4" /> Open the document</button>
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none"><DocBody content={document.content} onLink={gate.open} /></div>
        )}
      </div>
      {gate.element}
    </div>
  );
};

DocPage.layout = Workspace;
export default DocPage;
