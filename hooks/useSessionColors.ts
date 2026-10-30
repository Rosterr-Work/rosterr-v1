import useSWR from "swr";
import axios from "axios";
import { THEME_HEX, readableOn } from "@/utils/theme";

// The colours a workspace gave its kinds of session (Settings → Sessions → Colours), as Tailwind background classes. Every component
// that shows a session asks for them; SWR shares one request between them.

export type SessionColors = { recurring: string; shift: string; training: string; event: string; other: string };

// Written out in full (not built from parts) so Tailwind can see each class name.
export const defaultSessionColors: SessionColors = { other: "bg-zinc-500", event: "bg-purple-500", training: "bg-yellow-500", shift: "bg-green-500", recurring: "bg-blue-500" };

/** The colour for a session's type; anything that isn't shift, training or event gets the "other" colour. */
export function colourForType(colors: SessionColors, type: string | null | undefined): string {
  switch ((type ?? "").toLowerCase()) {
    case "shift":
      return colors.shift;
    case "training":
      return colors.training;
    case "event":
      return colors.event;
    default:
      return colors.other;
  }
}

/** Text for a Tailwind background class: white or near-black, whichever reads better on that colour. */
export function textOn(background: string): string {
  const hex = THEME_HEX[background.split(" ")[0]];
  if (!hex) return background.includes("yellow") || background.includes("orange-400") ? "text-zinc-800" : "text-white";
  return readableOn(hex) === "#ffffff" ? "text-white" : "text-zinc-900";
}

/** The address the colours come from. */
export const sessionColorsUrl = (workspaceId: number | string) => `/api/workspace/${workspaceId}/settings/general/session-colors`;

/**
 * Reads the colours: the colours object itself, or null when they couldn't be read. Every screen that asks for them MUST use this
 * fetcher: SWR keeps one cached value per address, so a screen that stored the raw response there made the next screen to read it
 * (Settings, after the sessions pages) get a shape it didn't expect and crash.
 */
export const fetchColors = (url: string): Promise<SessionColors | null> =>
  axios.get(url).then((r) => (r.data?.success && r.data.colors ? (r.data.colors as SessionColors) : null));

export function useSessionColors(workspaceId: number | string | undefined) {
  const { data, isLoading, mutate } = useSWR(workspaceId ? sessionColorsUrl(workspaceId) : null, fetchColors, {
    revalidateOnFocus: false,
  });
  const sessionColors = data ?? defaultSessionColors;

  return {
    sessionColors,
    isLoading,
    fetchSessionColors: () => mutate(),
    getSessionTypeColor: (type: string | null | undefined) => colourForType(sessionColors, type),
    getRecurringColor: () => sessionColors.recurring,
    getTextColorForBackground: textOn,
  };
}
