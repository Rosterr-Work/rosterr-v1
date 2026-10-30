import { useState } from "react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { Toaster } from "react-hot-toast";
import { IconAlertTriangle, IconArrowLeft, IconCheck, IconClock, IconFileText, IconShield } from "@tabler/icons-react";
import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import Workspace from "@/layouts/workspace";
import { withSessionSsr } from "@/lib/withSession";
import { Pill, ghostButton, solidButton } from "@/components/ui/parts";
import AcknowledgeDialog from "@/components/policies/AcknowledgeDialog";
import PolicyBody from "@/components/policies/PolicyBody";
import { deadlineNote } from "@/utils/policies/ack";
import { loadSignPage } from "@/utils/policies/sign";
import { deadlinePassed } from "@/utils/policies/stats";
import { fmtDate } from "@/utils/formatDate";

export const getServerSideProps = withSessionSsr(async ({ query, req }: any): Promise<any> => {
  const userId = req.session.userid;
  if (!userId) return { redirect: { destination: "/login" } };
  const groupId = parseInt(String(query.id), 10);
  if (!Number.isFinite(groupId) || !query.docId) return { notFound: true };
  const page = await loadSignPage(groupId, String(query.docId), userId, typeof query.link === "string" ? query.link : undefined);
  if (page.kind === "missing") return { notFound: true };
  if (page.kind === "not-for-you") return { redirect: { destination: `/workspace/${groupId}` } };
  if (page.kind === "link-closed") return { props: { closed: page.state } };
  return { props: page.props };
});

type Props = { document?: any; acknowledgment?: { acknowledgedAt: string } | null; closed?: "inactive" | "expired" | "unknown" };

const BANNER = {
  done: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
  late: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  soon: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  open: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
};

const PolicySignPage: pageWithLayout<Props> = ({ document, acknowledgment = null, closed }) => {
  const router = useRouter();
  const login = useRecoilValue(loginState);
  const groupId = String(router.query.id);
  const [signing, setSigning] = useState(false);
  if (closed || !document) {
    return (
      <div className="pagePadding">
        <div className="mx-auto max-w-md rounded-xl bg-white dark:bg-zinc-800 p-8 text-center shadow-sm">
          <h1 className="text-h3 text-zinc-900 dark:text-white">This link no longer works</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{closed === "expired" ? "It has expired." : closed === "inactive" ? "It has been switched off." : "It isn't a link to this policy."} Ask whoever sent it for a new one, or find the policy in your own list.</p>
          <button onClick={() => router.push(`/workspace/${groupId}/policies`)} className={`${solidButton} mt-5`}>Go to my policies</button>
        </div>
      </div>
    );
  }
  const note = deadlineNote(document.acknowledgmentDeadline);
  const late = deadlinePassed(document.acknowledgmentDeadline);

  const banner = acknowledgment
    ? { tone: BANNER.done, icon: <IconCheck className="w-5 h-5" />, title: "Already acknowledged", text: `You agreed to this on ${fmtDate(new Date(acknowledgment.acknowledgedAt))}.` }
    : late
      ? { tone: BANNER.late, icon: <IconAlertTriangle className="w-5 h-5" />, title: "Overdue", text: note?.text ?? "" }
      : note && (note.kind === "today" || note.kind === "soon")
        ? { tone: BANNER.soon, icon: <IconClock className="w-5 h-5" />, title: "Agreement needed", text: note.text }
        : { tone: BANNER.open, icon: <IconFileText className="w-5 h-5" />, title: "Agreement needed", text: "Read this policy, then agree to it." };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <div className="pagePadding">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} aria-label="Back" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><IconArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-h2 text-zinc-900 dark:text-white">Sign a policy</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">A direct link to one policy</p>
            </div>
          </div>
          <button onClick={() => router.push(`/workspace/${groupId}/policies`)} className={ghostButton}>All my policies</button>
        </div>

        <div className="overflow-hidden rounded-xl bg-white dark:bg-zinc-800 shadow-sm">
          <div className="border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><IconShield className="w-6 h-6" /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-h3 text-zinc-900 dark:text-zinc-100">{document.name}</h2>
                  {document.isTrainingDocument && <Pill colour="blue">Training</Pill>}
                  <Pill colour="amber">Policy</Pill>
                </div>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Created by {document.owner.username}{note && !acknowledgment ? ` · ${note.text}` : ""}</p>
              </div>
            </div>
            <div className={`mt-4 flex items-start gap-2 rounded-lg border p-3 ${banner.tone}`}>
              <span className="mt-0.5">{banner.icon}</span>
              <div>
                <p className="text-sm font-medium">{banner.title}</p>
                {banner.text && <p className="mt-0.5 text-xs opacity-90">{banner.text}</p>}
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <h3 className="mb-4 text-h3 text-zinc-900 dark:text-zinc-100">Policy</h3>
            <PolicyBody name={document.name} content={document.content} groupId={groupId} />
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 text-center">
            {acknowledgment ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Thank you, there is nothing more to do.</p>
            ) : (
              <button onClick={() => setSigning(true)} className={`${solidButton} px-6 py-3`}><IconShield className="w-4 h-4" /> Agree to this policy</button>
            )}
          </div>
        </div>
      </div>
      {signing && <AcknowledgeDialog groupId={groupId} policy={document} username={login.username} hideBody onClose={() => setSigning(false)} onDone={() => router.reload()} />}
    </div>
  );
};

PolicySignPage.layout = Workspace;
export default PolicySignPage;
