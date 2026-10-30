import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import axios from "axios";
import toast from "react-hot-toast";
import { IconAlertTriangle, IconChevronDown, IconClipboardList, IconDoorExit, IconPaperclip, IconPlus, IconRocket, IconStar, IconTrash, IconX } from "@tabler/icons-react";
import { loginState, workspacestate } from "@/state";
import { Dialog, EmptyState, dangerButton, ghostButton, solidButton } from "@/components/ui/parts";
import ImportedTag from "@/components/ui/ImportedTag";
import { fmtDate } from "@/utils/formatDate";
import { ENTRY_LABEL, MAX_ENTRY_FILES, MAX_FILE_BYTES, changesRank, fileSize, opensInPage, rankChangeText, ranksUnique, submitLabel, terminationAction, writableTypes, type LogbookPermissions } from "@/utils/profile/logbook";

type Props = { userBook: any[]; onRefetch?: () => void; logbookPermissions?: LogbookPermissions; /** Changes each time something outside (the profile header) asks to start a new entry. */ composeSignal?: number };
type Rank = { id: number; name: string; rank: number };
type FileRef = { id: string; filename: string; contentType: string; size: number };

const ICON: Record<string, JSX.Element> = {
  note: <IconClipboardList className="w-4 h-4" />,
  warning: <IconAlertTriangle className="w-4 h-4" />,
  promotion: <IconStar className="w-4 h-4" />,
  demotion: <IconX className="w-4 h-4" />,
  rank_change: <IconRocket className="w-4 h-4" />,
  termination: <IconX className="w-4 h-4" />,
  resignation: <IconDoorExit className="w-4 h-4" />,
};

const DOT: Record<string, string> = {
  note: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  promotion: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  demotion: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  rank_change: "bg-primary/10 text-primary",
  termination: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  resignation: "bg-primary/10 text-primary",
};
const small = "text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white";
const check = "w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 text-primary focus:ring-primary";

export default function Book({ userBook, onRefetch, logbookPermissions, composeSignal = 0 }: Props) {
  const router = useRouter();
  const id = router.query.id as string;
  const uid = router.query.uid as string;
  const workspace = useRecoilValue(workspacestate);
  const login = useRecoilValue(loginState);

  const [entries, setEntries] = useState<any[]>(userBook || []);
  const [composing, setComposing] = useState(false);
  // The profile header can ask for a new entry: the composer opens (and its box takes focus as it appears).
  const [signalSeen, setSignalSeen] = useState(0);
  if (composeSignal > 0 && composeSignal !== signalSeen) {
    setSignalSeen(composeSignal);
    setComposing(true);
  }
  const [text, setText] = useState("");
  const [type, setType] = useState("note");
  const [busy, setBusy] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [targetRank, setTargetRank] = useState("");
  const [botReady, setBotReady] = useState(false);
  const [kick, setKick] = useState(false);
  const [ban, setBan] = useState(false);
  const [banDays, setBanDays] = useState(0);
  const [menu, setMenu] = useState(false);
  const [redact, setRedact] = useState<any | null>(null);
  const [remove, setRemove] = useState<any | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Files chosen for the entry being written: uploaded as soon as they are picked, attached to the entry when it is added.
  const [files, setFiles] = useState<FileRef[]>([]);
  const [uploading, setUploading] = useState(0);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => setEntries(userBook || []), [userBook]);
  useEffect(() => {
    const away = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  // What this workspace has set up: a ranking service (so entries can move someone's rank) and the Discord bot (to take someone out of the server).
  useEffect(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/external/ranking`).then(async (r) => {
      setRanking(Boolean(r.data.rankGunEnabled));
      if (r.data.rankGunEnabled) {
        const list = await axios.get(`/api/workspace/${id}/ranks`).catch(() => null);
        if (list?.data?.success) setRanks(list.data.ranks);
      }
    }).catch(() => {});
    axios.get(`/api/workspace/${id}/discord-bot/ready`).then((r) => r.data.success && setBotReady(Boolean(r.data.ready))).catch(() => {});
  }, [id]);

  const types = useMemo(() => writableTypes(logbookPermissions, ranking), [logbookPermissions, ranking]);
  const rankOptions = useMemo(() => ranksUnique(ranks), [ranks]);
  const ranksUp = ranking && !!logbookPermissions?.rank && changesRank(type);
  const isOwner = Boolean(login?.userId && login.workspaces?.find((w: any) => w.groupId === workspace.groupId)?.ownerId === login.userId);

  const pick = (t: string) => {
    setType(t);
    setTargetRank("");
    setMenu(false);
  };

  const attach = async (list: FileList | File[] | null) => {
    const chosen = Array.from(list ?? []);
    if (picker.current) picker.current.value = "";
    if (!chosen.length) return;
    const room = MAX_ENTRY_FILES - files.length - uploading;
    if (room <= 0) return void toast.error(`An entry can have up to ${MAX_ENTRY_FILES} files.`);
    if (chosen.length > room) toast.error(`An entry can have up to ${MAX_ENTRY_FILES} files. Only the first ${room} were added.`);
    const take = chosen.slice(0, room);
    setUploading((n) => n + take.length);
    await Promise.all(
      take.map(async (file) => {
        try {
          if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is over ${MAX_FILE_BYTES / 1_048_576} MB.`);
          const { data } = await axios.post(`/api/workspace/${id}/userbook/${uid}/attachments/upload?name=${encodeURIComponent(file.name)}`, file, { headers: { "Content-Type": file.type || "application/octet-stream" } });
          setFiles((f) => [...f, data.attachment]);
        } catch (e: any) {
          toast.error(e?.response?.data?.error || e?.message || `Couldn't upload ${file.name}`);
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
  };

  const add = async () => {
    if (uploading > 0) return void toast.error("Wait for the files to finish uploading.");
    if (!text) return void toast.error("Please enter a note.");
    if (type === "rank_change" && !targetRank) return void toast.error("Please select a target rank.");
    const chosen = type === "rank_change" ? ranks.find((r) => String(r.id) === targetRank) : undefined;
    if (type === "rank_change" && !chosen) return void toast.error("Invalid rank selected.");
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/workspace/${id}/userbook/${uid}/new`, {
        notes: text,
        type,
        terminationAction: terminationAction(type, kick, ban),
        banDeleteDays: banDays,
        ...(chosen ? { targetRole: chosen.id } : {}),
        ...(files.length ? { attachmentIds: files.map((f) => f.id) } : {}),
      });
      setText("");
      setFiles([]);
      setTargetRank("");
      toast.success(data.terminated ? "User terminated successfully" : ranking && ["promotion", "demotion", "rank_change"].includes(type) ? "Note added and rank updated successfully." : "Note added successfully");
      if (data.log) setEntries((p) => [data.log, ...p]);
      onRefetch?.();
    } catch (e: any) {
      const raw = e?.response?.data?.error || e?.message || "Failed to add note";
      toast.error(typeof raw === "object" ? JSON.stringify(raw) : String(raw));
    } finally {
      setBusy(false);
    }
  };

  const confirmRedact = async () => {
    const entry = redact;
    setRedact(null);
    if (!entry) return;
    try {
      const { data } = await axios.post(`/api/workspace/${id}/userbook/${uid}/${entry.id}/redact`, { redacted: !entry.redacted });
      if (data.success) {
        toast.success(data.entry?.redacted ? "Entry redacted" : "Entry unredacted");
        setEntries((p) => p.map((e) => (e.id === data.entry.id ? data.entry : e)));
        onRefetch?.();
      }
    } catch {
      toast.error("Failed to redact entry.");
    }
  };

  const confirmDelete = async () => {
    const entry = remove;
    setRemove(null);
    if (!entry) return;
    try {
      const { data } = await axios.delete(`/api/workspace/${id}/userbook/${uid}/${entry.id}/delete`);
      if (data.success) {
        toast.success("Entry deleted");
        setEntries((p) => p.filter((e) => e.id !== entry.id));
        onRefetch?.();
      }
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-h3 text-zinc-900 dark:text-white">Logbook</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{entries.length === 0 ? "Nothing logged yet." : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}, newest first.`}</p>
        </div>
        {types.length > 0 && (
          <button type="button" onClick={() => setComposing((c) => !c)} aria-expanded={composing} className={composing ? ghostButton : solidButton}>
            {composing ? <><IconX className="h-4 w-4" /> Close</> : <><IconPlus className="h-4 w-4" /> Add entry</>}
          </button>
        )}
      </div>

      {composing && (
      <div id="log-composer" className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-700/20">
        <textarea autoFocus={composeSignal > 0} rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your comment.." onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void attach(e.dataTransfer.files); }} className="block w-full px-4 py-3 bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 resize-none rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
        <div className="flex flex-wrap items-center gap-2">
          <input ref={picker} type="file" multiple className="hidden" onChange={(e) => void attach(e.target.files)} aria-label="Attach files" />
          <button type="button" onClick={() => picker.current?.click()} disabled={busy || files.length + uploading >= MAX_ENTRY_FILES} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700">
            <IconPaperclip className="h-4 w-4" /> Attach files
          </button>
          {files.map((f) => (
            <span key={f.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              <span className="truncate max-w-[14rem]">{f.filename}</span>
              <span className="text-zinc-500 dark:text-zinc-400">{fileSize(f.size)}</span>
              <button type="button" onClick={() => setFiles((all) => all.filter((x) => x.id !== f.id))} aria-label={`Remove ${f.filename}`} className="text-zinc-400 hover:text-red-600"><IconX className="h-3.5 w-3.5" /></button>
            </span>
          ))}
          {uploading > 0 && <span className="text-xs text-zinc-500 dark:text-zinc-400">Uploading {uploading} {uploading === 1 ? "file" : "files"}…</span>}
          {files.length + uploading === 0 && <span className="text-xs text-zinc-400 dark:text-zinc-500">Up to {MAX_ENTRY_FILES} files, 10 MB each. Pictures and PDFs open in the page.</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
            {ranksUp && (
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Rank to:
                <select value={targetRank} onChange={(e) => setTargetRank(e.target.value)} className={small}>
                  <option value="">Select rank...</option>
                  {rankOptions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
            )}
            {type === "termination" && botReady && (
              <>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-zinc-500 dark:text-zinc-400">
                  <input type="checkbox" className={check} checked={kick} onChange={(e) => { setKick(e.target.checked); if (e.target.checked) setBan(false); }} /> Kick from server
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-zinc-500 dark:text-zinc-400">
                  <input type="checkbox" className={check} checked={ban} onChange={(e) => { setBan(e.target.checked); if (e.target.checked) setKick(false); }} /> Ban from server
                </label>
                {ban && (
                  <select value={banDays} onChange={(e) => setBanDays(parseInt(e.target.value, 10))} className={small} aria-label="Messages to delete">
                    {[[0, "Keep messages"], [1, "Delete 1 day"], [2, "Delete 2 days"], [3, "Delete 3 days"], [7, "Delete 7 days"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
              </>
            )}
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <div className="flex rounded-lg overflow-hidden">
              <button onClick={add} disabled={busy || types.length === 0} className={`${solidButton} whitespace-nowrap`}>
                {submitLabel(type, ranking && !!logbookPermissions?.rank, busy)}
              </button>
              {types.length > 1 && (
                <button type="button" onClick={() => setMenu((o) => !o)} disabled={busy} className="px-2 py-2 text-white bg-primary hover:bg-primary/80 border-l border-white/20 disabled:opacity-50" aria-label="Change entry type">
                  <IconChevronDown size={16} />
                </button>
              )}
            </div>
            {menu && (
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-20 overflow-hidden">
                {types.map((t) => (
                  <button key={t.value} type="button" onClick={() => pick(t.value)} className={`w-full text-left px-4 py-2.5 text-sm ${type === t.value ? "text-primary font-medium bg-primary/5" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {logbookPermissions?.view && (
        <div>
          {entries.length === 0 ? (
            <EmptyState icon={<IconClipboardList className="w-7 h-7" />} title="Nothing logged yet" text="Notes, warnings and rank changes for this member will appear here." />
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[1.1rem] before:top-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-700">
              {entries.map((entry) => {
                const moved = rankChangeText(entry);
                const struck = entry.redacted ? "line-through opacity-60 text-zinc-500 dark:text-zinc-300" : "";
                return (
                  <li key={entry.id} className="relative flex gap-3 sm:gap-4">
                    <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-800 ${DOT[entry.type] ?? DOT.note}`}>{ICON[entry.type] ?? ICON.note}</div>
                    <div className="flex min-w-0 grow gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800 sm:p-4">
                    <div className="grow min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium text-zinc-900 dark:text-white ${struck}`}>{ENTRY_LABEL[entry.type as keyof typeof ENTRY_LABEL] ?? "Note"}</span>
                          {moved && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">{moved}</span>}
                          <ImportedTag record={entry} />
                        </div>
                        <time dateTime={entry.createdAt} className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(entry.createdAt)}</time>
                      </div>
                      <p className={`text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-300 mb-1 ${struck}`}>{entry.reason}</p>
                      {Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                        entry.redacted && !logbookPermissions?.redact ? (
                          <p className="mb-1 text-xs text-zinc-400 dark:text-zinc-300">{entry.attachments.length} {entry.attachments.length === 1 ? "file" : "files"} hidden</p>
                        ) : (
                          <ul className="mb-2 flex flex-wrap gap-2">
                            {entry.attachments.map((a: FileRef) => (
                              <li key={a.id}>
                                <a
                                  href={`/api/workspace/${id}/userbook/${uid}/attachments/${a.id}${opensInPage(a.contentType) ? "?inline=1" : ""}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:border-primary hover:text-primary dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 ${struck}`}
                                >
                                  <IconPaperclip className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate max-w-[16rem]">{a.filename}</span>
                                  <span className="text-zinc-500 dark:text-zinc-400">{fileSize(a.size)}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Logged by {entry.admin?.username || "Unknown"}</p>
                      {entry.redacted && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-300 mt-2">
                          Redacted by {entry.redactedByUser?.username || (entry.redactedBy ? String(entry.redactedBy) : "Unknown")} on {entry.redactedAt ? fmtDate(entry.redactedAt) : "Unknown"}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {logbookPermissions?.redact && (
                        <button onClick={() => setRedact(entry)} className={`${ghostButton} !px-2.5 !py-1 text-xs`}>
                          <IconAlertTriangle className="w-4 h-4 mr-2" /> {entry.redacted ? "Undo" : "Redact"}
                        </button>
                      )}
                      {isOwner && (
                        <button onClick={() => setRemove(entry)} className={`${dangerButton} !px-2.5 !py-1 text-xs`}>
                          <IconTrash className="w-4 h-4 mr-2" /> Delete
                        </button>
                      )}
                    </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {redact && (
        <Dialog title={redact.redacted ? "Undo Redaction" : "Redact Entry"} onClose={() => setRedact(null)} actions={<><button className={ghostButton} onClick={() => setRedact(null)}>Cancel</button><button className="px-4 py-2 text-sm bg-amber-500 text-zinc-900 rounded-lg hover:bg-amber-600" onClick={confirmRedact}>{redact.redacted ? "Undo" : "Redact"}</button></>}>
          {redact.redacted ? "Un-redacting will make the entry visible again." : "Mark this entry as redacted? This will cross it out for viewers."}
        </Dialog>
      )}
      {remove && (
        <Dialog title="Confirm Deletion" onClose={() => setRemove(null)} actions={<><button className={ghostButton} onClick={() => setRemove(null)}>Cancel</button><button className={dangerButton} onClick={confirmDelete}>Delete</button></>}>
          Are you sure you want to permanently delete this entry? This action cannot be undone.
        </Dialog>
      )}
    </div>
  );
}
