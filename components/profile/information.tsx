import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import toast from "react-hot-toast";
import { IconBriefcase, IconCalendar, IconCheck, IconClock, IconId, IconMail, IconPencil, IconUser, IconUserCheck, IconX } from "@tabler/icons-react";
import { pillStyle } from "@/utils/theme";
import { convertLegacyTimezone, formatTimezoneDisplay, getTimezoneOptions } from "@/utils/timezoneUtils";
import { Avatar, CopyButton, InfoCard, factText, ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import { fmtDate } from "@/utils/formatDate";

type Person = { userid: string; username: string; picture: string };
type Department = { id: string; name: string; color: string | null };

type Props = {
  user: { userid: string; username: string; displayname: string; registered: boolean; birthdayDay?: number | null; birthdayMonth?: number | null; joinDate?: string | null };
  workspaceMember?: { departments?: Department[]; lineManagerId?: string | null; timezone?: string | null; discordId?: string | null; email?: string | null };
  lineManager?: Person | null;
  manages?: Person[];
  allMembers?: Person[];
  availableDepartments?: Department[];
  isUser?: boolean;
  isAdmin?: boolean;
  canEditMembers?: boolean;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const timezones = getTimezoneOptions();
// Older entries were stored as place names ("Europe/London"); they are shown, and saved back, in the current form.
const currentZone = (tz?: string | null) => (tz ? (tz.includes("/") ? convertLegacyTimezone(tz) : tz) : "");

function DepartmentDot({ d }: { d: Department }) {
  return <span className="w-3 h-3 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" style={pillStyle(d.color, "#6b7280")} />;
}

/** A line manager picker: type to search the workspace, choose one (or none). */
function ManagerPicker({ people, self, value, onChange }: { people: Person[]; self: string; value: Person | null; onChange: (p: Person | null) => void }) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    return people.filter((p) => p.userid !== self && (!t || p.username.toLowerCase().includes(t))).slice(0, 6);
  }, [people, self, q]);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder={value ? `Now: ${value.username}. Search to change…` : "Search members…"} aria-label="Search for a line manager" />
        {value && <button type="button" className={ghostButton} onClick={() => onChange(null)}>None</button>}
      </div>
      {q && (
        <ul className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">No members found.</li>}
          {matches.map((p) => (
            <li key={p.userid}>
              <button type="button" className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => { onChange(p); setQ(""); }}>
                <Avatar src={p.picture} userId={p.userid} size={24} />
                <span className="text-zinc-900 dark:text-white">{p.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Who this person reports to, and who reports to them, as a small tree. */
function ReportingLine({ workspaceId, user, manager, manages }: { workspaceId: string; user: Props["user"]; manager: Person | null; manages: Person[] }) {
  const router = useRouter();
  const go = (id: string) => router.push(`/workspace/${workspaceId}/profile/${id}`);
  if (!manager && manages.length === 0) return <p className={factText}>Not assigned</p>;
  return (
    <div>
      {manager && (
        <>
          <button type="button" onClick={() => go(manager.userid)} className="flex items-center gap-2 group w-full text-left">
            <Avatar src={manager.picture} userId={manager.userid} />
            <span className={`${factText} group-hover:text-primary transition-colors truncate`}>{manager.username}</span>
          </button>
          <div className="ml-3 border-l-2 border-zinc-300 dark:border-zinc-600 h-3" />
        </>
      )}
      <div className="flex items-center gap-2">
        <Avatar src={`/api/workspace/${workspaceId}/avatar/${user.userid}`} userId={user.userid} ring />
        <span className={`${factText} truncate`}>{user.username}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">(this profile)</span>
      </div>
      {manages.length > 0 && (
        <ul className="ml-3 border-l-2 border-zinc-300 dark:border-zinc-600 pl-3 mt-1 space-y-2">
          {manages.map((m) => (
            <li key={m.userid} className="relative flex items-center gap-2">
              <span className="absolute -left-3 top-1/2 w-2.5 border-t-2 border-zinc-300 dark:border-zinc-600" />
              <button type="button" onClick={() => go(m.userid)} className="flex items-center gap-2 group text-left">
                <Avatar src={m.picture} userId={m.userid} size={24} />
                <span className={`${factText} group-hover:text-primary transition-colors truncate`}>{m.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InformationTab({ user, workspaceMember, lineManager, manages = [], allMembers = [], availableDepartments = [], isUser, isAdmin, canEditMembers }: Props) {
  const router = useRouter();
  const workspaceId = router.query.id as string;
  const canEdit = Boolean(isUser || isAdmin || canEditMembers);

  const initial = () => ({
    departments: workspaceMember?.departments ?? [],
    manager: lineManager ?? null,
    timezone: currentZone(workspaceMember?.timezone),
    month: user.birthdayMonth ? String(user.birthdayMonth) : "",
    day: user.birthdayDay ? String(user.birthdayDay) : "",
    discordId: workspaceMember?.discordId ?? "",
    email: workspaceMember?.email ?? "",
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ReturnType<typeof initial>>(k: K, v: ReturnType<typeof initial>[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/workspace/${workspaceId}/profile/${user.userid}/member-info`, {
        departmentIds: form.departments.map((d) => d.id),
        lineManagerId: form.manager?.userid || null,
        discordId: form.discordId || null,
        // Time zone, email and birthday are the person's own, one value for every workspace: only they send them (a manager's save leaves
        // them alone, and the server refuses a manager who tries).
        ...(isUser
          ? { timezone: form.timezone || null, birthdayDay: form.day ? parseInt(form.day, 10) : null, birthdayMonth: form.month ? parseInt(form.month, 10) : null, email: form.email || null }
          : {}),
      });
      toast.success("Information updated");
      setEditing(false);
      router.replace(router.asPath);
    } catch {
      toast.error("Failed to update information");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm(initial());
    setEditing(false);
  };

  const toggleDepartment = (d: Department) =>
    set("departments", form.departments.some((x) => x.id === d.id) ? form.departments.filter((x) => x.id !== d.id) : [...form.departments, d]);

  const copyable = (value: string | null | undefined, empty: string, label: string) => (
    <div className="flex items-center gap-1">
      <p className={factText}>{value || empty}</p>
      {value && <CopyButton text={value} label={label} />}
    </div>
  );

  const birthday = user.birthdayDay && user.birthdayMonth ? `${MONTHS[user.birthdayMonth - 1]} ${user.birthdayDay}` : "Not set";
  const shownManager = form.manager ?? lineManager ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-h3 text-zinc-900 dark:text-white">Details</h3>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className={ghostButton}>
            <IconPencil className="w-4 h-4" /> Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={cancel} className={ghostButton}><IconX className="w-4 h-4" /> Cancel</button>
            <button onClick={save} disabled={saving} className={solidButton}><IconCheck className="w-4 h-4" /> Save</button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <section aria-label="Work">
          <h4 className="text-label mb-2 text-zinc-500 dark:text-zinc-400">Work</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
<InfoCard icon={<IconBriefcase className="w-5 h-5 text-primary" />} tint="bg-primary/10" label={`Department${form.departments.length !== 1 ? "s" : ""}`}>
            {editing ? (
              availableDepartments.length ? (
                <div className="flex flex-wrap gap-2">
                  {availableDepartments.map((d) => {
                    const on = form.departments.some((x) => x.id === d.id);
                    return (
                      <button key={d.id} type="button" aria-pressed={on} onClick={() => toggleDepartment(d)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-full border transition ${on ? "border-primary bg-primary/10 text-primary" : "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300"}`}>
                        <DepartmentDot d={d} /> {d.name} {on && <IconCheck className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">No departments available.</p>
            ) : form.departments.length ? (
              <ul className="space-y-1">
                {form.departments.map((d) => (
                  <li key={d.id} className="flex items-center gap-2"><DepartmentDot d={d} /><span className={factText}>{d.name}</span></li>
                ))}
              </ul>
            ) : <p className={factText}>Not assigned</p>}
          </InfoCard>
<InfoCard icon={<IconUserCheck className="w-5 h-5 text-primary" />} tint="bg-primary/10" label="Line Manager">
            {editing ? (
              <ManagerPicker people={allMembers} self={user.userid} value={form.manager} onChange={(p) => set("manager", p)} />
            ) : (
              <ReportingLine workspaceId={workspaceId} user={user} manager={shownManager} manages={manages} />
            )}
          </InfoCard>
{user.joinDate && (
<InfoCard icon={<IconCalendar className="w-5 h-5 text-primary" />} tint="bg-primary/10" label="Join Date">
              <p className={factText}>{fmtDate(new Date(user.joinDate))}</p>
            </InfoCard>
)}
<InfoCard icon={<IconClock className="w-5 h-5 text-primary" />} tint="bg-primary/10" label="Timezone">
            {editing && isUser ? (
              <select className={inputClass} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} aria-label="Timezone">
                <option value="">Not set</option>
                {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            ) : <p className={factText}>{formatTimezoneDisplay(workspaceMember?.timezone)}</p>}
          </InfoCard>
          </div>
        </section>
        <section aria-label="Contact">
          <h4 className="text-label mb-2 text-zinc-500 dark:text-zinc-400">Contact</h4>
          {editing && <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{isUser ? "Your time zone, email and birthday are one value for every workspace you are in. You can also change them in your account settings." : "Their time zone, email and birthday are theirs to set, once for every workspace."}</p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
<InfoCard icon={<IconUser className="w-5 h-5 text-primary" />} tint="bg-primary/10" label="Discord ID">
            {editing ? (
              <input className={inputClass} value={form.discordId} onChange={(e) => set("discordId", e.target.value)} placeholder="Enter Discord ID" />
            ) : copyable(workspaceMember?.discordId, "Not linked", "Copy Discord ID")}
          </InfoCard>
<InfoCard icon={<IconMail className="w-5 h-5 text-primary" />} tint="bg-primary/10" label="Email">
            {editing && isUser ? (
              <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter email address" />
            ) : copyable(workspaceMember?.email, "Not set", "Copy email")}
          </InfoCard>
          </div>
        </section>
        <section aria-label="Account">
          <h4 className="text-label mb-2 text-zinc-500 dark:text-zinc-400">Account</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
<InfoCard icon={<IconId className="w-5 h-5 text-primary" />} tint="bg-primary/10" label="User ID">
            <div className="flex items-center gap-1">
              <p className={`${factText} font-mono`}>{user.userid}</p>
              <CopyButton text={user.userid} label="Copy user ID" />
            </div>
          </InfoCard>
<InfoCard icon={<IconCalendar className="w-5 h-5 text-primary" />} tint="bg-primary/10" label="Birthday">
            {editing && isUser ? (
              <div className="flex gap-2">
                <select className={inputClass} value={form.month} onChange={(e) => set("month", e.target.value)} aria-label="Birthday month">
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select className={inputClass} value={form.day} onChange={(e) => set("day", e.target.value)} aria-label="Birthday day">
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : <p className={factText}>{birthday}</p>}
          </InfoCard>
          </div>
        </section>
      </div>
    </div>
  );
}
