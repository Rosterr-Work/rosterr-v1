import { useState } from "react";
import useSWR from "swr";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconPencil, IconPlus, IconTag, IconTrash } from "@tabler/icons-react";
import { Dialog, EmptyState, Fold, Spinner, dangerButton, ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import { Field } from "@/components/ui/fields";
import Swatches from "./Swatches";

type Tag = { id: string; name: string; color: string; allowedTypes: string[] };
const KINDS = [{ value: "shift", label: "Shift" }, { value: "training", label: "Training" }, { value: "event", label: "Event" }, { value: "other", label: "Other" }];
const fetcher = (u: string) => axios.get(u).then((r) => r.data);

/** Settings > Sessions > Session tags: labels that can be put on a session, each with a colour and the kinds of session it is for. */
function SessionTags() {
  const id = useRouter().query.id as string | undefined;
  const url = `/api/workspace/${id}/settings/activity/session-tags`;
  const { data, mutate } = useSWR<{ tags: Tag[] }>(id ? url : null, fetcher, { revalidateOnFocus: false });
  const [editing, setEditing] = useState<Tag | "new" | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("bg-blue-500");
  const [kinds, setKinds] = useState<string[]>([]);
  const [removing, setRemoving] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);

  if (!data) return <Spinner />;

  const open = (t: Tag | "new") => {
    setEditing(t);
    setName(t === "new" ? "" : t.name);
    setColor(t === "new" ? "bg-blue-500" : t.color);
    setKinds(t === "new" ? [] : t.allowedTypes);
  };

  const run = async (go: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await go();
      toast.success(ok);
      await mutate();
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "That wasn't saved");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const body = { name, color, allowedTypes: kinds };
    const done = await run(() => (editing === "new" ? axios.post(url, body) : axios.patch(url, { id: (editing as Tag).id, ...body })), editing === "new" ? "Tag added" : "Tag saved");
    if (done) setEditing(null);
  };

  return (
    <Fold title={Titled.title} hint={Titled.description} status={`${data.tags.length} ${data.tags.length === 1 ? "tag" : "tags"}`}>
      <div className="space-y-4">

        {data.tags.length === 0 ? (
          <EmptyState icon={<IconTag className="w-6 h-6" />} title="No tags yet" text="Add your first tag to label sessions." />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60 rounded-lg border border-zinc-200 dark:border-zinc-700">
            {data.tags.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                <span className={`h-4 w-4 shrink-0 rounded ${t.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.allowedTypes.length ? `For ${t.allowedTypes.join(", ")} sessions` : "For every kind of session"}</p>
                </div>
                <button type="button" aria-label={`Edit ${t.name}`} onClick={() => open(t)} className="rounded p-1 text-zinc-400 hover:text-zinc-700"><IconPencil className="w-4 h-4" /></button>
                <button type="button" aria-label={`Delete ${t.name}`} onClick={() => setRemoving(t)} className="rounded p-1 text-zinc-400 hover:text-red-500"><IconTrash className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}

        {!editing && <button type="button" className={ghostButton} onClick={() => open("new")}><IconPlus className="w-4 h-4" /> Add tag</button>}

        {editing && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <Field label="Name"><input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus /></Field>
            <Field label="Colour"><Swatches value={color} onChange={setColor} label="Tag colour" /></Field>
            <Field label="Which sessions can have it" hint="Leave all unticked for every kind.">
              <div className="flex flex-wrap gap-3">
                {KINDS.map((k) => (
                  <label key={k.value} className="inline-flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-200">
                    <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-primary dark:border-zinc-600" checked={kinds.includes(k.value)} onChange={(e) => setKinds(e.target.checked ? [...kinds, k.value] : kinds.filter((x) => x !== k.value))} /> {k.label}
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex gap-2">
              <button type="button" className={solidButton} disabled={busy || !name.trim()} onClick={save}>{busy ? "Saving…" : "Save tag"}</button>
              <button type="button" className={ghostButton} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        )}

        {removing && (
          <Dialog
            title={`Delete “${removing.name}”?`}
            onClose={() => setRemoving(null)}
            actions={
              <>
                <button type="button" className={ghostButton} onClick={() => setRemoving(null)}>Keep it</button>
                <button type="button" className={dangerButton} onClick={async () => { await run(() => axios.delete(url, { data: { id: removing.id } }), "Tag deleted"); setRemoving(null); }}>Delete</button>
              </>
            }
          >
            Sessions that have this tag keep running without it.
          </Dialog>
        )}
      </div>
    </Fold>
  );
}

const Titled = Object.assign(SessionTags, { title: "Session tags", description: "Labels for sessions, such as the kind of training." });
export default Titled;
