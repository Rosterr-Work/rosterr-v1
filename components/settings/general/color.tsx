import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { IconCheck, IconPalette } from "@tabler/icons-react";
import { workspacestate } from "@/state";
import type { FC } from "@/types/settingsComponent";
import { THEME_HEX, applyGroupTheme } from "@/utils/theme";
import SeasonSetting from "./SeasonSetting";

// Settings > Appearance > Accent colour: one colour from the palette, or any colour of your own. It is applied as soon as it is
// chosen, and put back if it can't be saved.

const PALETTE = Object.keys(THEME_HEX).filter((k) => /^bg-(pink|rose|orange|amber|lime|emerald|cyan|sky|indigo|purple|violet)-(100|400|600)$/.test(k));

// "bg-red-100" is "Rose 100": the swatches have no text, so this is what a screen reader hears.
const nameOf = (cls: string) => cls.replace(/^bg-/, "").split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const Color: FC<{ triggerToast?: unknown; isSidebarExpanded?: boolean }> = () => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const current: string = workspace?.groupTheme || "";
  const [custom, setCustom] = useState(current.startsWith("custom-") ? `#${current.slice(7)}` : "#3498db");
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (wait.current) clearTimeout(wait.current); }, []);

  const save = async (theme: string) => {
    const before = workspace?.groupTheme || "bg-rosterr";
    setWorkspace((w: any) => ({ ...w, groupTheme: theme }));
    applyGroupTheme(theme);
    try {
      await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/color`, { color: theme });
      toast.success("Accent colour saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Couldn't save the colour");
      setWorkspace((w: any) => ({ ...w, groupTheme: before }));
      applyGroupTheme(before);
    }
  };

  const chooseCustom = (hex: string) => {
    setCustom(hex);
    const theme = `custom-${hex.slice(1)}`;
    applyGroupTheme(theme);
    if (wait.current) clearTimeout(wait.current);
    wait.current = setTimeout(() => save(theme), 500);
  };

  const check = (
    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
      <IconCheck size={16} className="text-white" />
    </span>
  );

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-h3 text-zinc-900 dark:text-white"><IconPalette size={20} className="text-primary" /> Workspace theme</h3>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">Choose a colour theme for your workspace.</p>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
          <label className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-primary">
            <input type="color" value={custom} onChange={(e) => chooseCustom(e.target.value)} aria-label="Pick your own colour" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span className="pointer-events-none absolute inset-0" style={{ backgroundColor: custom }} />
            {current.startsWith("custom-") && check}
          </label>
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => save(c)} aria-label={nameOf(c)} aria-pressed={current === c} className={`relative aspect-square rounded-lg transition-transform hover:scale-105 ${c}`}>
              {current === c && check}
            </button>
          ))}
        </div>
      </section>
      <SeasonSetting />
    </div>
  );
};

Color.title = "Accent colour";
Color.description = "The colour used for buttons and highlights across your workspace.";

export default Color;
