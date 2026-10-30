import { useRecoilState, useRecoilValue } from "recoil";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { setStoredPreference, themePreferenceState, themeState } from "@/state/theme";

// A light/dark flip for pages nobody is signed in on yet (login, verify-roblox), which can't reach Settings → Appearance. It saves the
// preference, not only the resolved theme, so it agrees with whatever is chosen there later (pages/_app.tsx resolves one from the
// other).

export default function ThemeToggle() {
  const theme = useRecoilValue(themeState);
  const [, setPreference] = useRecoilState(themePreferenceState);

  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setStoredPreference(next);
    setPreference(next);
  };

  return (
    <button type="button" onClick={flip} title="Toggle theme" aria-label="Toggle theme" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-700">
      {theme === "dark" ? <SunIcon className="h-5 w-5 text-amber-400" /> : <MoonIcon className="h-5 w-5 text-zinc-600" />}
    </button>
  );
}
