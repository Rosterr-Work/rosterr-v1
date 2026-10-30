import { useEffect, useState } from "react";
import useSWR from "swr";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { fetchColors, sessionColorsUrl } from "@/hooks/useSessionColors";
import { Fold, Spinner, solidButton } from "@/components/ui/parts";
import { COLOUR_KEYS, DEFAULT_COLOURS, type ColourKey, type SessionColours } from "@/utils/sessions/palette";
import Swatches from "./Swatches";

const NAMES: Record<ColourKey, { label: string; hint?: string }> = {
  recurring: { label: "Recurring", hint: "The label on sessions that repeat." },
  shift: { label: "Shift" },
  training: { label: "Training" },
  event: { label: "Event" },
  other: { label: "Other", hint: "Any other kind of session." },
};

/** Settings > Sessions > Session type colours: one colour for each kind of session, used across the sessions screens. */
function SessionColors() {
  const id = useRouter().query.id as string | undefined;
  const url = id ? sessionColorsUrl(id) : "";
  // The same fetcher and address as hooks/useSessionColors.ts, so the two share one cached value of one shape.
  const { data, mutate } = useSWR<SessionColours | null>(id ? url : null, fetchColors, { revalidateOnFocus: false });
  const [colours, setColours] = useState<SessionColours>(DEFAULT_COLOURS);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setColours({ ...DEFAULT_COLOURS, ...data });
  }, [data]);

  // undefined: still loading. null: couldn't be read, so the defaults are shown and a save writes all five.
  if (data === undefined) return <Spinner />;
  const saved: SessionColours = { ...DEFAULT_COLOURS, ...(data ?? {}) };
  const changed = COLOUR_KEYS.some((k) => colours[k] !== saved[k]);
  const custom = COLOUR_KEYS.some((k) => saved[k] !== DEFAULT_COLOURS[k]);

  const save = async () => {
    setBusy(true);
    try {
      await axios.patch(url, { colors: colours });
      toast.success("Session colours saved");
      await mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Couldn't save the colours");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Fold title={Titled.title} hint={Titled.description} status={custom ? "Custom colours" : "Default colours"}>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {COLOUR_KEYS.map((k) => (
          <div key={k} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-white">{NAMES[k].label}</p>
              {NAMES[k].hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{NAMES[k].hint}</p>}
            </div>
            <Swatches value={colours[k]} onChange={(v) => setColours({ ...colours, [k]: v })} label={`${NAMES[k].label} colour`} />
          </div>
        ))}
      </div>
      <button type="button" className={`${solidButton} mt-3`} disabled={!changed || busy} onClick={save}>{busy ? "Saving…" : "Save colours"}</button>
    </Fold>
  );
}

const Titled = Object.assign(SessionColors, { title: "Session type colours", description: "The colour of each kind of session on the sessions screens." });
export default Titled;
