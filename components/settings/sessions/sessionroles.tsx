import { useState } from "react";
import useSWR from "swr";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconArrowDown, IconArrowUp, IconPencil, IconPlus, IconRestore, IconTrash } from "@tabler/icons-react";
import { Fold, Pill, Spinner, ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import type { FC } from "@/types/settingsComponent";
import RoleDialog, { type Category, type Template, type WorkspaceRole } from "./roles/RoleDialog";
import { askText } from "@/utils/ui/ask";

// Settings > Sessions > Session roles: the reusable places in a session (Host, Co-host, Trainee...), grouped in categories.

type Data = { templates: Template[]; archivedTemplates: Template[]; categories: Category[]; archivedCategories: Category[]; roles: WorkspaceRole[]; legacy: { importable: number; patchable: number; recordable: number } };
const fetcher = (u: string) => axios.get(u).then((r) => r.data);

const swap = <T,>(list: T[], i: number, j: number) => {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

const SessionRoles: FC<{ triggerToast?: unknown }> = () => {
  const id = useRouter().query.id as string | undefined;
  const base = `/api/workspace/${id}/settings/sessions`;
  const { data, mutate } = useSWR<Data>(id ? `${base}/roles` : null, fetcher, { revalidateOnFocus: false });
  const [editing, setEditing] = useState<null | "new" | Template>(null);
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  if (!data) return <Spinner label="Loading session roles…" />;

  const run = async (go: () => Promise<any>, ok: string, failed = "That wasn't saved") => {
    setBusy(true);
    try {
      const r = await go();
      if (ok) toast.success(typeof ok === "string" ? ok : "Saved");
      await mutate();
      return r;
    } catch (e: any) {
      toast.error(e?.response?.data?.error || failed);
    } finally {
      setBusy(false);
    }
  };

  const save = (body: any) =>
    run(() => (editing === "new" ? axios.post(`${base}/rtemplates`, body) : axios.patch(`${base}/rtemplates/${(editing as Template).id}`, body)), "Role saved").then(() => setEditing(null));

  const remove = (t: Template) =>
    run(async () => {
      const r = await axios.delete(`${base}/rtemplates/${t.id}`);
      if (r.data.archived) toast("Used by sessions, so it was archived instead", { icon: "ℹ️" });
    }, "Role removed");

  // Order is kept in each role's weight: moving one swaps places with its neighbour and writes the new order as 0, 10, 20…
  const move = (group: Template[], i: number, by: -1 | 1) => {
    const order = swap(group, i, i + by);
    return run(() => Promise.all(order.map((t, n) => (t.weight === n * 10 ? null : axios.patch(`${base}/rtemplates/${t.id}`, { weight: n * 10 })))), "");
  };
  const moveCategory = (i: number, by: -1 | 1) => {
    const order = swap(data.categories, i, i + by);
    return run(() => Promise.all(order.map((c, n) => (c.weight === n * 10 ? null : axios.patch(`${base}/rcategories/${c.id}`, { weight: n * 10 })))), "");
  };

  const sections = [...data.categories.map((c) => ({ category: c as Category | null, list: data.templates.filter((t) => t.categoryId === c.id) })), { category: null, list: data.templates.filter((t) => !t.categoryId || !data.categories.some((c) => c.id === t.categoryId)) }].filter((s) => s.category || s.list.length);
  const legacy = data.legacy;

  const row = (t: Template, group: Template[], i: number) => (
    <li key={t.id} className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{t.name}</p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {t.hostRole && <Pill colour="blue">{t.hostRole === "primary" ? "Primary host" : "Secondary host"}</Pill>}
          <Pill>{t.slots} {t.slots === 1 ? "place" : "places"}</Pill>
          {t.eligibleRoleIds.length > 0 && <Pill colour="amber">{t.eligibleRoleIds.length} {t.eligibleRoleIds.length === 1 ? "role" : "roles"} only</Pill>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(group, i, -1)} className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"><IconArrowUp className="w-4 h-4" /></button>
        <button type="button" aria-label="Move down" disabled={busy || i === group.length - 1} onClick={() => move(group, i, 1)} className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"><IconArrowDown className="w-4 h-4" /></button>
        <button type="button" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)} className="rounded p-1 text-zinc-400 hover:text-zinc-700"><IconPencil className="w-4 h-4" /></button>
        <button type="button" aria-label={`Remove ${t.name}`} disabled={busy} onClick={() => remove(t)} className="rounded p-1 text-zinc-400 hover:text-red-500"><IconTrash className="w-4 h-4" /></button>
      </div>
    </li>
  );

  return (
    <Fold title={SessionRoles.title as string} hint={SessionRoles.description} status={`${data.templates.length} ${data.templates.length === 1 ? "role" : "roles"}`} defaultOpen>
      <div className="space-y-4">
        {(legacy.importable > 0 || legacy.patchable > 0 || legacy.recordable > 0) && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium">Sessions from before roles existed need tidying</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {legacy.importable > 0 && <button type="button" disabled={busy} className={ghostButton} onClick={() => run(() => axios.post(`${base}/rtemplates/convert`, { action: "import" }), "Roles imported")}>Import {legacy.importable} role{legacy.importable === 1 ? "" : "s"} from old sessions</button>}
              {legacy.patchable > 0 && <button type="button" disabled={busy} className={ghostButton} onClick={() => run(() => axios.post(`${base}/rtemplates/convert`, { action: "patch-host-roles" }), "Host roles filled in")}>Fill in {legacy.patchable} missing host role{legacy.patchable === 1 ? "" : "s"}</button>}
              {legacy.recordable > 0 && <button type="button" disabled={busy} className={ghostButton} onClick={() => run(() => axios.post(`${base}/rtemplates/convert`, { action: "add-host-records" }), "Hosts recorded")}>Record {legacy.recordable} missing host{legacy.recordable === 1 ? "" : "s"}</button>}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button type="button" className={solidButton} onClick={() => setEditing("new")}><IconPlus className="w-4 h-4" /> Add role</button>
        </div>

        {sections.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No roles yet. Add the first one.</p>}
        {sections.map(({ category, list }) => {
          const ci = category ? data.categories.findIndex((c) => c.id === category.id) : -1;
          return (
            <section key={category?.id ?? "none"} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-3">
              <header className="mb-1 flex items-center gap-2">
                <h4 className="min-w-0 flex-1 truncate text-label text-zinc-500 dark:text-zinc-400">{category?.name ?? "No category"}</h4>
                {category && (
                  <>
                    <button type="button" aria-label="Move category up" disabled={busy || ci === 0} onClick={() => moveCategory(ci, -1)} className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"><IconArrowUp className="w-4 h-4" /></button>
                    <button type="button" aria-label="Move category down" disabled={busy || ci === data.categories.length - 1} onClick={() => moveCategory(ci, 1)} className="rounded p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"><IconArrowDown className="w-4 h-4" /></button>
                    <button type="button" aria-label={`Rename ${category.name}`} onClick={() => { askText({ title: "Rename category", label: "Name", initial: category.name, confirmLabel: "Rename" }).then((n) => { if (n && n !== category.name) run(() => axios.patch(`${base}/rcategories/${category.id}`, { name: n }), "Category renamed"); }); }} className="rounded p-1 text-zinc-400 hover:text-zinc-700"><IconPencil className="w-4 h-4" /></button>
                    <button type="button" aria-label={`Remove ${category.name}`} disabled={busy} onClick={() => run(() => axios.delete(`${base}/rcategories/${category.id}`), "Category removed")} className="rounded p-1 text-zinc-400 hover:text-red-500"><IconTrash className="w-4 h-4" /></button>
                  </>
                )}
              </header>
              {list.length === 0 ? <p className="py-2 text-sm text-zinc-500 dark:text-zinc-400">No roles in this category.</p> : <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60">{list.map((t, i) => row(t, list, i))}</ul>}
            </section>
          );
        })}

        <div className="flex flex-wrap items-center gap-2">
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" maxLength={64} className={`${inputClass} min-w-0 flex-1 sm:max-w-xs`} aria-label="New category name" />
          <button type="button" className={ghostButton} disabled={busy || !newCategory.trim()} onClick={() => run(() => axios.post(`${base}/rcategories`, { name: newCategory, weight: data.categories.length * 10 }), "Category added").then(() => setNewCategory(""))}>
            <IconPlus className="w-4 h-4" /> Add category
          </button>
        </div>

        {(data.archivedTemplates.length > 0 || data.archivedCategories.length > 0) && (
          <Fold title="Archived" hint="Removed roles and categories that past sessions still use. Restore one to use it again." status={`${data.archivedTemplates.length + data.archivedCategories.length} archived`}>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
              {data.archivedCategories.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm"><span className="text-zinc-700 dark:text-zinc-200">{c.name} <span className="text-zinc-400">(category)</span></span>
                  <button type="button" className="text-primary" onClick={() => run(() => axios.patch(`${base}/rcategories/${c.id}`, { archived: false }), "Category restored")}><IconRestore className="inline w-4 h-4" /> Restore</button></li>
              ))}
              {data.archivedTemplates.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm"><span className="text-zinc-700 dark:text-zinc-200">{t.name}</span>
                  <button type="button" className="text-primary" onClick={() => run(() => axios.patch(`${base}/rtemplates/${t.id}`, { archived: false }), "Role restored")}><IconRestore className="inline w-4 h-4" /> Restore</button></li>
              ))}
            </ul>
          </Fold>
        )}
      </div>

      {editing && <RoleDialog template={editing === "new" ? null : editing} categories={data.categories} roles={data.roles} busy={busy} onClose={() => setEditing(null)} onSave={save} />}
    </Fold>
  );
};

SessionRoles.title = "Session roles";
SessionRoles.description = "The places in a session people can take, such as Host or Trainee. You pick which to use when making a session.";

export default SessionRoles;
