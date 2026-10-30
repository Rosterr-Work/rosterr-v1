import { useEffect, useState } from "react";
import useSWR from "swr";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { Dialog, Fold, Spinner, dangerButton, ghostButton, inputClass } from "@/components/ui/parts";

// Settings > Permissions > Departments: add, rename, colour, reorder and remove. The order is the one the directory uses.

export type Department = { id: string; name: string; color: string | null; memberCount?: number };
const fetcher = (u: string) => axios.get(u).then((r) => r.data);
const PALETTE = ["#6b7280", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"];

function Row({ d, first, last, base, onChanged, onRemove, onMove }: { d: Department; first: boolean; last: boolean; base: string; onChanged: () => void; onRemove: () => void; onMove: (by: -1 | 1) => void }) {
  const [name, setName] = useState(d.name);
  useEffect(() => setName(d.name), [d.name]);

  const save = async (patch: { name?: string; color?: string }) => {
    try {
      await axios.post(`${base}/${d.id}/update`, patch);
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "That wasn't saved");
      setName(d.name);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <input
        type="color"
        aria-label={`Colour for ${d.name}`}
        value={d.color ?? "#6b7280"}
        list="department-colours"
        onChange={(e) => save({ color: e.target.value })}
        className="h-8 w-8 shrink-0 cursor-pointer rounded border border-zinc-300 dark:border-zinc-600 bg-transparent p-0.5"
      />
      <input
        value={name}
        maxLength={60}
        aria-label="Department name"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name.trim() !== d.name && save({ name })}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={`${inputClass} min-w-0 flex-1 basis-[calc(100%-2.75rem)] sm:basis-0`}
      />
      <span className="ml-11 mr-auto text-xs text-zinc-500 sm:ml-0 sm:mr-0 dark:text-zinc-400">{d.memberCount ?? 0} {d.memberCount === 1 ? "person" : "people"}</span>
      <button type="button" aria-label="Move up" disabled={first} onClick={() => onMove(-1)} className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"><IconArrowUp className="w-4 h-4" /></button>
      <button type="button" aria-label="Move down" disabled={last} onClick={() => onMove(1)} className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"><IconArrowDown className="w-4 h-4" /></button>
      <button type="button" aria-label={`Delete ${d.name}`} onClick={onRemove} className="rounded p-1 text-zinc-400 hover:text-red-500"><IconTrash className="w-4 h-4" /></button>
    </li>
  );
}

export default function Departments(_props: { departments?: unknown; setDepartments?: unknown }) {
  const id = useRouter().query.id as string | undefined;
  const base = `/api/workspace/${id}/settings/departments`;
  const { data, mutate } = useSWR<{ departments: Department[] }>(id ? base : null, fetcher, { revalidateOnFocus: false });
  const [removing, setRemoving] = useState<Department | null>(null);
  if (!data) return <Spinner />;
  const list = data.departments;

  const move = async (i: number, by: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    await mutate({ departments: next }, false);
    try {
      await axios.post(`${base}/order`, { order: next.map((d) => d.id) });
    } catch {
      toast.error("Couldn't save the order");
    }
    mutate();
  };

  const add = async () => {
    try {
      await axios.post(`${base}/new`, {});
      await mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Couldn't add a department");
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await axios.post(`${base}/${removing.id}/delete`);
      toast.success("Department removed");
      await mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Couldn't remove it");
    }
    setRemoving(null);
  };

  return (
    <Fold title="Departments" hint="Groups for the directory, quotas and documents, in the order shown here." status={`${list.length} ${list.length === 1 ? "department" : "departments"}`}>
      <datalist id="department-colours">{PALETTE.map((c) => <option key={c} value={c} />)}</datalist>
      {list.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No departments yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3">
          {list.map((d, i) => (
            <Row key={d.id} d={d} first={i === 0} last={i === list.length - 1} base={base} onChanged={() => mutate()} onRemove={() => setRemoving(d)} onMove={(by) => move(i, by)} />
          ))}
        </ul>
      )}
      <button type="button" onClick={add} className={`${ghostButton} mt-3`}><IconPlus className="w-4 h-4" /> Add department</button>
      {removing && (
        <Dialog
          title={`Delete ${removing.name}?`}
          onClose={() => setRemoving(null)}
          actions={
            <>
              <button type="button" className={ghostButton} onClick={() => setRemoving(null)}>Keep it</button>
              <button type="button" className={dangerButton} onClick={remove}>Delete</button>
            </>
          }
        >
          {removing.memberCount ? `${removing.memberCount} ${removing.memberCount === 1 ? "person leaves" : "people leave"} it, and quotas and documents that were for it stop applying to it.` : "Nothing uses it yet."}
        </Dialog>
      )}
    </Fold>
  );
}
