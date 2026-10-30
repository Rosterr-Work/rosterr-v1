import { atom } from "recoil";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const VALID_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];
const isValidPreference = (v: string | null): v is ThemePreference => VALID_PREFERENCES.includes(v as ThemePreference);

/** What's saved in localStorage: an explicit "light"/"dark", "system" (the default), or nothing yet (also "system"). */
export const getStoredPreference = (): ThemePreference => {
	if (typeof window === "undefined") return "system";
	const stored = localStorage.getItem("theme");
	return isValidPreference(stored) ? stored : "system";
};

export const setStoredPreference = (pref: ThemePreference) => {
	if (typeof window !== "undefined") localStorage.setItem("theme", pref);
};

export const systemPrefersDark = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export const resolveTheme = (pref: ThemePreference): ResolvedTheme => (pref === "system" ? (systemPrefersDark() ? "dark" : "light") : pref);

const __global = globalThis as any;
__global.__recoilAtoms = __global.__recoilAtoms || {};

/** Light, dark or system — what the person chose (Settings → Appearance). */
export const themePreferenceState = __global.__recoilAtoms.themePreferenceState || (__global.__recoilAtoms.themePreferenceState = atom<ThemePreference>({
	key: "themePreferenceState",
	default: getStoredPreference(),
}));

/** Light or dark — the preference resolved against the OS when it's "system". This is what actually gets applied
 * as a class on <html>; see pages/_app.tsx's ThemeHandler, which keeps it in step with the preference above. */
export const themeState = __global.__recoilAtoms.themeState || (__global.__recoilAtoms.themeState = atom<ResolvedTheme>({
	key: "themeState",
	default: resolveTheme(getStoredPreference()),
}));
