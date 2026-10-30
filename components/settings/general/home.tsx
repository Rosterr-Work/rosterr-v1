import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { useRecoilState } from "recoil";
import { IconCheck, IconPhoto, IconPlus, IconTrash, IconWorld, IconX } from "@tabler/icons-react";
import { workspacestate } from "@/state";
import { ghostButton, inputClass, solidButton } from "@/components/ui/parts";
import type { FC } from "@/types/settingsComponent";

const MAX_GAMES = 10;
const fetcher = (u: string) => axios.get(u).then((r) => r.data);

/** An image picked from the computer, scaled to fit 1920 x 1080 and saved as a compact WebP. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image"));
      img.onload = () => {
        const ratio = Math.min(1, 1920 / img.width, 1080 / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function Banner({ groupId }: { groupId: string }) {
  const [, setWorkspace] = useRecoilState(workspacestate);
  const url = `/api/workspace/${groupId}/settings/general/banner`;
  const { data, mutate } = useSWR<{ bannerImage: string | null }>(url, fetcher, { revalidateOnFocus: false });
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const shown = draft ?? data?.bannerImage ?? null;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Image must be under 10 MB");
    try {
      setDraft(await shrink(file));
    } catch {
      toast.error("That image couldn't be read");
    }
  };

  const save = async (image: string | null) => {
    setBusy(true);
    try {
      await axios.patch(url, { bannerImage: image });
      setDraft(null);
      await mutate();
      setWorkspace((w: any) => ({ ...w, settings: { ...w.settings, bannerImage: image } }));
      toast.success(image ? "Banner saved" : "Banner removed");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Couldn't save the banner");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><IconPhoto size={16} className="text-primary" /> Home banner image</h4>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">Shown behind the greeting on your home page. PNG, JPEG, WebP or GIF, under 10 MB, up to 1920 x 1080.</p>
      {shown && <img src={shown} alt="Banner preview" className="mb-3 h-32 w-full rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800" />}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pick} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghostButton} onClick={() => input.current?.click()}><IconPhoto className="w-4 h-4" /> {shown ? "Change image" : "Upload an image"}</button>
        {draft && <button type="button" className={solidButton} disabled={busy} onClick={() => save(draft)}><IconCheck className="w-4 h-4" /> {busy ? "Saving…" : "Save banner"}</button>}
        {draft && <button type="button" className={ghostButton} onClick={() => setDraft(null)}>Discard</button>}
        {!draft && shown && <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20" disabled={busy} onClick={() => save(null)}><IconTrash className="w-4 h-4" /> Remove</button>}
      </div>
    </section>
  );
}

function Games({ groupId }: { groupId: string }) {
  const url = `/api/workspace/${groupId}/settings/general/games`;
  const { data, mutate } = useSWR<{ placeIds: number[] }>(url, fetcher, { revalidateOnFocus: false });
  const [ids, setIds] = useState<string[]>([]);
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setIds(data.placeIds.map(String));
  }, [data]);
  if (!data) return null;

  const changed = JSON.stringify(ids) !== JSON.stringify(data.placeIds.map(String));
  const add = () => {
    const v = next.trim();
    if (!/^\d+$/.test(v) || Number(v) <= 0 || ids.includes(v)) return;
    if (ids.length >= MAX_GAMES) return toast.error(`Up to ${MAX_GAMES} games`);
    setIds([...ids, v]);
    setNext("");
  };
  const save = async () => {
    setBusy(true);
    try {
      await axios.patch(url, { placeIds: ids.map(Number) });
      await mutate();
      toast.success("Games saved");
    } catch {
      toast.error("Couldn't save the games");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><IconWorld size={16} className="text-primary" /> Games box: place IDs</h4>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">Add Roblox place IDs (the number in the game's address, such as roblox.com/games/<strong>1818</strong>) to list them on the home page. Up to {MAX_GAMES}.</p>
      <div className="mb-3 flex gap-2">
        <input inputMode="numeric" value={next} placeholder="Place ID" onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && add()} className={inputClass} aria-label="Place ID" />
        <button type="button" className={ghostButton} onClick={add}><IconPlus className="w-4 h-4" /> Add</button>
      </div>
      {ids.length > 0 && (
        <ul className="mb-3 space-y-2">
          {ids.map((id) => (
            <li key={id} className="flex items-center justify-between rounded-lg border border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2">
              <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{id}</span>
              <button type="button" aria-label={`Remove ${id}`} onClick={() => setIds(ids.filter((x) => x !== id))} className="rounded-full p-1 text-zinc-400 hover:text-red-500"><IconX className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={solidButton} disabled={busy || !changed} onClick={save}><IconCheck className="w-4 h-4" /> {busy ? "Saving…" : "Save games"}</button>
    </section>
  );
}

const Home: FC<{ triggerToast?: unknown; isSidebarExpanded?: boolean; hasResetActivityOnly?: boolean }> = () => {
  const groupId = useRouter().query.id as string | undefined;
  if (!groupId) return null;
  return (
    <div className="space-y-8">
      <Banner groupId={groupId} />
      <Games groupId={groupId} />
    </div>
  );
};

Home.title = "Home page";
Home.description = "The banner and games your members see when they open the workspace.";

export default Home;
