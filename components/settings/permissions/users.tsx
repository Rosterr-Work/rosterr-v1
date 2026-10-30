import { useEffect, useState } from "react";
import useSWR from "swr";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconChevronLeft, IconChevronRight, IconRefresh, IconSearch, IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import { Avatar, Dialog, EmptyState, Fold, Modal, Pill, Spinner, dangerButton, ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import { Field, SelectBox } from "@/components/ui/fields";

// Settings > Permissions > People: who has which role in this workspace. Choose a role to see its people, move someone to another
// role, update a role from their Roblox rank, take them out, or add someone by Roblox username.

type RoleRow = { id: string; name: string; color: string | null; isOwnerRole: boolean; count: number };
type Person = { userid: number; username: string; displayName: string; thumbnail: string; roles: { id: string; name: string }[]; manuallyAdded: boolean; isAdmin: boolean };
type Page = { users: Person[]; total: number; totalPages: number; page: number };
const fetcher = (u: string) => axios.get(u).then((r) => r.data);

function RoleMembers({ groupId, role, roles, search, onChanged }: { groupId: string; role: RoleRow; roles: RoleRow[]; search: string; onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setPage(1), [search, role.id]);
  const base = `/api/workspace/${groupId}/settings/users`;
  const key = `${base}?roleId=${role.id}&page=${page}&pageSize=20&search=${encodeURIComponent(search)}`;
  const { data, mutate } = useSWR<Page>(key, fetcher, { keepPreviousData: true, revalidateOnFocus: false });

  const act = async (go: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await go();
      toast.success(ok);
      await mutate();
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "That didn't work");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Spinner />;
  if (data.users.length === 0) return <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">{search ? "No one here matches that name." : "No one has this role yet."}</p>;

  return (
    <div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
        {data.users.map((u) => (
          <li key={u.userid} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <Avatar src={u.thumbnail} userId={u.userid} size={36} />
            <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
              <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white"><span className="truncate">{u.displayName}</span>{u.isAdmin && <Pill colour="blue">Admin</Pill>}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">@{u.username} {u.manuallyAdded ? "· set by hand" : "· from Roblox rank"}</p>
            </div>
            <div className="ml-12 min-w-0 flex-1 sm:ml-0 sm:w-44 sm:flex-none">
              <SelectBox
                value={role.id}
                disabled={busy}
                onChange={(roleId) => act(() => axios.post(`${base}/${u.userid}/update`, { role: roleId }), "Role changed")}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
              />
            </div>
            <button type="button" title="Set the role from their Roblox rank" aria-label={`Resync ${u.username}`} disabled={busy} onClick={() => act(() => axios.post(`${base}/${u.userid}/resync`), "Role updated from Roblox")} className="rounded p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"><IconRefresh className="w-4 h-4" /></button>
            <button type="button" aria-label={`Remove ${u.username}`} disabled={busy || u.isAdmin} onClick={() => setRemoving(u)} className="rounded p-1.5 text-zinc-400 hover:text-red-500 disabled:opacity-30"><IconUserMinus className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
      {data.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)} className={ghostButton}><IconChevronLeft className="w-4 h-4" /></button>
          <span className="tabular-nums">{page} / {data.totalPages}</span>
          <button type="button" aria-label="Next page" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className={ghostButton}><IconChevronRight className="w-4 h-4" /></button>
        </div>
      )}
      {removing && (
        <Dialog
          title={`Remove ${removing.username}?`}
          onClose={() => setRemoving(null)}
          actions={
            <>
              <button type="button" className={ghostButton} onClick={() => setRemoving(null)}>Keep them</button>
              <button type="button" className={dangerButton} onClick={async () => { await act(() => axios.delete(`${base}/${removing.userid}/remove`), "Person removed"); setRemoving(null); }}>Remove</button>
            </>
          }
        >
          They lose their role, their departments and their place in this workspace.
        </Dialog>
      )}
    </div>
  );
}

function AddPerson({ groupId, roles, onClose, onAdded }: { groupId: string; roles: RoleRow[]; onClose: () => void; onAdded: () => void }) {
  const [username, setUsername] = useState("");
  const [roleId, setRoleId] = useState<string>(roles.find((r) => !r.isOwnerRole)?.id ?? roles[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await axios.post(`/api/workspace/${groupId}/settings/users/add`, { username, role: roleId });
      toast.success("Person added");
      onAdded();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Couldn't add them");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Add a person"
      subtitle="They don't need to be in your Roblox group yet."
      onClose={onClose}
      footer={
        <>
          <button type="button" className={ghostButton} onClick={onClose}>Cancel</button>
          <button type="button" className={solidButton} disabled={busy || !username.trim() || !roleId} onClick={submit}>{busy ? "Adding…" : "Add"}</button>
        </>
      }
    >
      <Field label="Roblox username"><input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} autoFocus /></Field>
      <Field label="Role"><SelectBox value={roleId} onChange={setRoleId} options={roles.map((r) => ({ value: r.id, label: r.name }))} /></Field>
      {error && <p className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </Modal>
  );
}

export default function Users(_props: { roles?: unknown }) {
  const router = useRouter();
  const groupId = router.query.id as string | undefined;
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const { data, mutate } = useSWR<{ roles: RoleRow[] }>(groupId ? `/api/workspace/${groupId}/settings/users?search=${encodeURIComponent(search)}` : null, fetcher, { keepPreviousData: true, revalidateOnFocus: false });
  if (!groupId || !data) return <Spinner />;
  const roles = data.roles;

  return (
    <Fold title="People" hint="Who has which role. Open a role to change someone's role or remove them." defaultOpen>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search people" aria-label="Search people" className={`${inputClass} pl-9`} />
        </div>
        <button type="button" onClick={() => setAdding(true)} className={`${solidButton} sm:ml-auto`}><IconUserPlus className="w-4 h-4" /> Add a person</button>
      </div>

      {roles.length === 0 ? (
        <EmptyState icon={<IconUserPlus className="w-6 h-6" />} title="No roles yet" text="Create a role first, then add people to it." />
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-200 dark:border-zinc-700">
              <button type="button" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="h-3 w-3 rounded-full" style={{ background: r.color || "#a1a1aa" }} />
                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-white">{r.name}</span>
                <Pill>{r.count} {r.count === 1 ? "person" : "people"}</Pill>
              </button>
              {open === r.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-700/60 px-4 pb-3">
                  <RoleMembers groupId={groupId} role={r} roles={roles} search={search} onChanged={() => mutate()} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && <AddPerson groupId={groupId} roles={roles} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); mutate(); }} />}
    </Fold>
  );
}
