import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Field, SelectBox } from "@/components/ui/fields";
import { Spinner, ghostButton, inputClass, solidButton } from "@/components/ui/parts";

// Settings > Roblox & ranking: the Open Cloud key Rosterr reads your group with, and the service it ranks people through.

type Loaded = { rankingProvider: string; rankingToken: string; rankingWorkspaceId: string; robloxApiKey: string; robloxApiKeyValid?: boolean };
type KeyState = "untested" | "testing" | "valid" | "invalid";

const ExternalServices: React.FC<{ triggerToast?: unknown }> & { title: string; description?: string } = () => {
  const groupId = useRouter().query.id as string | undefined;
  const base = `/api/workspace/${groupId}/settings/external`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [provider, setProvider] = useState("");
  const [token, setToken] = useState("");
  const [rankgunId, setRankgunId] = useState("");
  const [key, setKey] = useState("");
  const [state, setState] = useState<KeyState>("untested");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await axios.get<Loaded>(`${base}?validate=true`);
    setLoaded(r.data);
    setProvider(r.data.rankingProvider);
    setRankgunId(r.data.rankingWorkspaceId);
    setToken("");
    setKey("");
    setState(!r.data.robloxApiKey ? "untested" : r.data.robloxApiKeyValid === false ? "invalid" : "valid");
  };

  useEffect(() => {
    if (groupId) load().catch(() => setLoaded({ rankingProvider: "", rankingToken: "", rankingWorkspaceId: "", robloxApiKey: "" }));
  }, [groupId]);

  if (!loaded) return <Spinner />;

  const test = async () => {
    setState("testing");
    try {
      const r = await axios.post(`${base}/test-roblox-key`, { apiKey: key });
      if (r.data.valid) {
        setState("valid");
        toast.success(`Key works: found ${r.data.memberCount} member${r.data.memberCount === 1 ? "" : "s"}. ${r.data.requiresUserSocialRead ? r.data.message : ""}`.trim());
      } else {
        setState("invalid");
        toast.error(r.data.message);
      }
    } catch {
      setState("invalid");
      toast.error("Couldn't test the key");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.post(base, { rankingProvider: provider, rankingToken: token || undefined, rankingWorkspaceId: rankgunId, robloxApiKey: key.trim() || undefined });
      toast.success("Saved");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const pickProvider = (p: string) => {
    if (p !== provider) {
      setToken("");
      setRankgunId("");
    }
    setProvider(p);
  };

  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Ranking service</h4>
        <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">Used for promotions, demotions and rank changes you record in the logbook.</p>
        <Field label="Ranking service">
          <SelectBox value={provider} onChange={pickProvider} options={[{ value: "", label: "None" }, { value: "rankgun", label: "RankGun" }, { value: "roblox_cloud", label: "Roblox Open Cloud" }]} />
        </Field>
        {provider === "rankgun" && (
          <>
            <Field label="RankGun API key" hint={loaded.rankingToken ? `Saved: ${loaded.rankingToken}. Enter a new one to replace it.` : "Stored securely and used only to talk to RankGun."}>
              <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Your RankGun API key" className={inputClass} />
            </Field>
            <Field label="RankGun workspace ID"><input value={rankgunId} onChange={(e) => setRankgunId(e.target.value)} className={inputClass} /></Field>
          </>
        )}
        {provider === "roblox_cloud" && (
          <p className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300">
            Roblox Open Cloud ranking uses the API key below. Give the key <b>group:read</b> and <b>group:write</b> access to your group so it can promote, demote and change ranks.
          </p>
        )}
      </section>

      <section className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Roblox Open Cloud API key</h4>
        <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400"><b>Required</b> to keep your group's members in step with Roblox.</p>
        <Field label="API key" hint={loaded.robloxApiKey ? `Saved: ${loaded.robloxApiKey}. Enter a new key to replace it.` : undefined}>
          <div className="flex gap-2">
            <input type="password" aria-label="Roblox Open Cloud API key" autoComplete="off" value={key} onChange={(e) => { setKey(e.target.value); setState("untested"); }} placeholder={loaded.robloxApiKey ? "Enter a new key to replace it" : "Your Roblox Open Cloud API key"} className={inputClass} />
            <button type="button" onClick={test} disabled={!key.trim() || state === "testing"} className={ghostButton}>
              {state === "valid" ? <IconCheck className="w-4 h-4 text-emerald-600" /> : state === "invalid" ? <IconX className="w-4 h-4 text-red-600" /> : null}
              {state === "testing" ? "Testing…" : "Test key"}
            </button>
          </div>
        </Field>
        {state === "invalid" && !key && <p className="text-sm text-red-600">The saved key is no longer accepted by Roblox. Enter a new one.</p>}
      </section>

      <button type="button" className={solidButton} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save settings"}</button>
    </div>
  );
};

ExternalServices.title = "Roblox API key & ranking";
ExternalServices.description = "The key and service Rosterr uses to rank members and read your Roblox group.";

export default ExternalServices;
