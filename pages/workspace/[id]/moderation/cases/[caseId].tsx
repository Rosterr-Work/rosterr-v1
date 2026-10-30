import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useRecoilValue } from "recoil";
import { IconAlertTriangle, IconArrowLeft, IconBan, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";
import { moderationPlaceOptions } from "@/utils/moderationPlaces";
import { loadCase } from "@/utils/moderation/case-load";
import { isBan } from "@/utils/moderation/cases-ui";
import CaseExtras from "@/components/moderation/CaseExtras";
import Places, { type Game } from "@/components/moderation/Places";
import Evidence from "@/components/moderation/case/Evidence";
import Side from "@/components/moderation/case/Side";
import Summary from "@/components/moderation/case/Summary";
import { Dialog, dangerButton, ghostButton, inputClass, solidButton } from "@/components/ui/parts";

type Props = { case: any; games: Game[] };

export const getServerSideProps = withPermissionCheckSsr(async ({ params }) => {
  const groupId = BigInt(params?.id as string);
  if (!(await getConfig("moderation", groupId))?.enabled) return { notFound: true };
  const found = await loadCase(groupId, String(params?.caseId));
  if (!found) return { notFound: true };
  return { props: { case: found, games: await moderationPlaceOptions(groupId) } };
}, ["view_moderation"]);

const button = (tone: string) => `flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium text-sm ${tone}`;

const CaseDetailPage: pageWithLayout<Props> = ({ case: c, games }) => {
  const router = useRouter();
  const groupId = router.query.id as string;
  const caseId = router.query.caseId as string;
  const me = useRecoilValue(workspacestate);
  const login = useRecoilValue(loginState);
  const can = (p: string) => Boolean(me.isAdmin || me.yourPermission?.includes(p));
  const mine = String(login.userId ?? "");
  const canEdit = can("edit_moderation_cases") || c.createdBy === mine;
  const base = `/api/workspace/${groupId}/moderation/cases/${caseId}`;
  const refresh = () => router.replace(router.asPath);

  const [dialog, setDialog] = useState<null | "edit" | "revoke" | "delete">(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [places, setPlaces] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const openEdit = () => {
    setReason(c.reason);
    setDescription(c.description ?? "");
    setPlaces((c.placeIds ?? []).map(Number).filter((n: number) => !isNaN(n) && n > 0));
    setDialog("edit");
  };

  const act = async (request: () => Promise<any>, ok: string, fail: string, after?: () => void) => {
    setBusy(true);
    try {
      const { data } = await request();
      if (data.success) {
        toast.success(ok);
        setDialog(null);
        (after ?? refresh)();
      } else toast.error(data.error || fail);
    } catch (e: any) {
      toast.error(e.response?.data?.error || fail);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = () => (reason.trim() ? act(() => axios.put(base, { reason: reason.trim(), description: description.trim() || undefined, placeIds: places.map(String) }), "Case updated", "Failed to update case.") : void toast.error("Reason is required"));
  const revoke = () => (reason.trim() ? act(() => axios.post(`${base}/revoke`, { reason }), "Case action revoked successfully", "Failed to revoke case action") : void toast.error("Please provide a reason for revocation"));
  const remove = () => act(() => axios.delete(base), "Case deleted successfully", "Failed to delete case", () => router.push(`/workspace/${groupId}/moderation`));
  const ban = () => act(() => axios.post(`/api/workspace/${groupId}/moderation/bans`, { userId: c.targetUserId, username: c.targetUsername, reason: c.reason, duration: c.banDuration, expiresAt: c.expiresAt, isPermanent: c.action === "perm_ban", caseId }), "Ban executed successfully", "Failed to execute ban");
  const kick = () => act(() => axios.post(`${base}/execute-kick`), "Kick executed successfully", "Failed to execute kick");
  const live = c.status === "open" && can("execute_punishments") && !c.revokedAt;

  return (
    <div className="p-4 md:p-6">
      <Toaster position="bottom-center" />
      <button onClick={() => router.push(`/workspace/${groupId}/moderation`)} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4"><IconArrowLeft size={20} /> Back to Cases</button>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-h2 text-zinc-900 dark:text-white">Case Details</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Case ID: {caseId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && <button onClick={openEdit} className={button("bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600")}><IconPencil size={18} /> Edit Case</button>}
          {can("delete_moderation_cases") && <button onClick={() => setDialog("delete")} className={button("bg-red-600 hover:bg-red-700")}><IconTrash size={18} /> Delete Case</button>}
          {c.action && !c.revokedAt && can("revoke_punishments") && <button onClick={() => { setReason(""); setDialog("revoke"); }} className={button("bg-orange-500 hover:bg-orange-600")}><IconX size={18} /> Revoke Action</button>}
          {live && isBan(c.action) && <button onClick={ban} className={button("bg-red-500 hover:bg-red-600")}><IconBan size={18} /> Execute Ban</button>}
          {live && c.action === "kick" && <button onClick={kick} className={button("bg-orange-500 hover:bg-orange-600")}><IconAlertTriangle size={18} /> Execute Kick</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Summary c={c} groupId={groupId} games={games} />
          <Evidence groupId={groupId} caseId={caseId} evidence={c.evidence} me={mine} canEdit={canEdit} onChanged={refresh} />
          <CaseExtras groupId={groupId} caseData={c} canReview={can("review_appeals")} myUserId={mine} />
        </div>
        <Side c={c} groupId={groupId} />
      </div>

      {dialog === "edit" && (
        <Dialog title="Edit Case" onClose={() => setDialog(null)} actions={<><button className={ghostButton} onClick={() => setDialog(null)}>Cancel</button><button className={solidButton} disabled={busy} onClick={saveEdit}>{busy ? "Saving..." : "Save"}</button></>}>
          <div className="space-y-4 text-left">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Reason<input className={`${inputClass} mt-1`} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description<textarea className={`${inputClass} mt-1 resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
            <div><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Affected Places</p><Places games={games} picked={places} onChange={setPlaces} /></div>
          </div>
        </Dialog>
      )}
      {dialog === "revoke" && (
        <Dialog title="Revoke Action" onClose={() => setDialog(null)} actions={<><button className={ghostButton} onClick={() => setDialog(null)}>Cancel</button><button className="px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 text-white disabled:opacity-50" disabled={busy || !reason.trim()} onClick={revoke}>{busy ? "Revoking..." : "Revoke Action"}</button></>}>
          <div className="text-left">
            <p className="mb-3">This will revoke the action for this case. Please provide a reason for the revocation.</p>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Revocation Reason <span className="text-red-500">*</span><textarea className={`${inputClass} mt-1 resize-none`} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this action is being revoked..." /></label>
          </div>
        </Dialog>
      )}
      {dialog === "delete" && (
        <Dialog title="Delete Case" onClose={() => setDialog(null)} actions={<><button className={ghostButton} onClick={() => setDialog(null)}>Cancel</button><button className={dangerButton} disabled={busy} onClick={remove}>{busy ? "Deleting..." : "Delete Case"}</button></>}>
          Are you sure you want to permanently delete this case? This will also remove any linked bans and evidence. This action cannot be undone.
        </Dialog>
      )}
    </div>
  );
};

CaseDetailPage.layout = workspace;

export default CaseDetailPage;
