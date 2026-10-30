import { useState } from "react";
import useSWR from "swr";
import axios from "axios";
import moment from "moment";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconCopy, IconKey, IconPlus, IconTrash } from "@tabler/icons-react";
import { Dialog, EmptyState, Modal, Pill, Spinner, dangerButton, ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import { Field, SelectBox } from "@/components/ui/fields";

// Settings > Public API > API keys: the keys your game uses to talk to Rosterr. A new key is shown once; after that only its last four
// characters are kept.

type Key = { id: string; name: string; key: string; lastUsedAt: string | null; lastUsedIp?: string | null; lastUsedPath?: string | null; createdAt: string; expiresAt: string | null; createdBy: { userid: number; username: string; picture: string } | null };
const fetcher = (u: string) => axios.get(u).then((r) => r.data);

export const ApiKeys = (_props: { triggerToast?: unknown }) => {
  const id = useRouter().query.id as string | undefined;
  const base = `/api/workspace/${id}/settings/api-keys`;
  const { data, mutate } = useSWR<{ apiKeys: Key[] }>(id ? base : null, fetcher, { revalidateOnFocus: false });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState("90days");
  const [made, setMade] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <Spinner />;

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await axios.post(`${base}/create`, { name, expiresIn });
      setMade(r.data.apiKey.key);
      await mutate();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Couldn't create the key");
    } finally {
      setBusy(false);
    }
  };

  const closeCreate = () => {
    setCreating(false);
    setMade(null);
    setName("");
    setExpiresIn("90days");
    setError("");
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await axios.delete(`${base}/${removing.id}/delete`);
      toast.success("Key deleted");
      await mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Couldn't delete the key");
    }
    setRemoving(null);
  };

  const day = (iso: string) => moment(iso).format("D MMM YYYY");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-zinc-900 dark:text-white">API keys</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Keys let your game or other tools read and change your workspace.</p>
        </div>
        <button type="button" className={solidButton} onClick={() => setCreating(true)}><IconPlus className="w-4 h-4" /> Create key</button>
      </div>

      {data.apiKeys.length === 0 ? (
        <EmptyState icon={<IconKey className="w-6 h-6" />} title="No API keys" text="Create a key to connect your game." />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60 rounded-lg border border-zinc-200 dark:border-zinc-700">
          {data.apiKeys.map((k) => {
            const expired = k.expiresAt ? new Date(k.expiresAt) < new Date() : false;
            return (
              <li key={k.id} className="flex items-center gap-3 px-4 py-3">
                <IconKey className="w-5 h-5 shrink-0 self-start text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-zinc-900 dark:text-white">
                    <span className="min-w-0 truncate">{k.name}</span>
                    <span className="font-mono text-xs font-normal text-zinc-400">{k.key}</span>
                    {expired && <Pill colour="red">Expired</Pill>}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Created {day(k.createdAt)}{k.createdBy ? ` by ${k.createdBy.username}` : ""}
                    {k.expiresAt && ` · ${expired ? "Expired" : "Expires"} ${day(k.expiresAt)}`}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400" title={[k.lastUsedIp && `From ${k.lastUsedIp}`, k.lastUsedPath].filter(Boolean).join(", ") || undefined}>
                    {k.lastUsedAt ? `Last used ${moment(k.lastUsedAt).fromNow()}` : "Never used"}
                  </p>
                </div>
                <button type="button" aria-label={`Delete ${k.name}`} onClick={() => setRemoving(k)} className="rounded p-1.5 text-zinc-400 hover:text-red-500"><IconTrash className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <Modal
          title={made ? "Your new key" : "Create an API key"}
          onClose={closeCreate}
          footer={
            made ? (
              <button type="button" className={solidButton} onClick={closeCreate}>Done</button>
            ) : (
              <>
                <button type="button" className={ghostButton} onClick={closeCreate}>Cancel</button>
                <button type="button" className={solidButton} disabled={busy || !name.trim()} onClick={create}>{busy ? "Creating…" : "Create key"}</button>
              </>
            )
          }
        >
          {made ? (
            <div>
              <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">Copy this key now. You won't be able to see it again.</p>
              <div className="flex items-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3">
                <code className="min-w-0 flex-1 break-all text-xs text-zinc-800 dark:text-zinc-100">{made}</code>
                <button type="button" aria-label="Copy key" className="rounded p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white" onClick={() => { navigator.clipboard.writeText(made); toast.success("Copied"); }}><IconCopy className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <>
              <Field label="Name" hint="So you can tell it apart, such as the name of the game."><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus /></Field>
              <Field label="Expires">
                <SelectBox value={expiresIn} onChange={setExpiresIn} options={[{ value: "30days", label: "In 30 days" }, { value: "90days", label: "In 90 days" }, { value: "1year", label: "In a year" }, { value: "never", label: "Never" }]} />
              </Field>
              {error && <p className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
            </>
          )}
        </Modal>
      )}

      {removing && (
        <Dialog
          title={`Delete “${removing.name}”?`}
          onClose={() => setRemoving(null)}
          actions={
            <>
              <button type="button" className={ghostButton} onClick={() => setRemoving(null)}>Keep it</button>
              <button type="button" className={dangerButton} onClick={remove}>Delete</button>
            </>
          }
        >
          Anything using this key stops working straight away.
        </Dialog>
      )}
    </div>
  );
};

ApiKeys.title = "API keys";
ApiKeys.description = "Keys that let your game or other tools use your workspace.";
