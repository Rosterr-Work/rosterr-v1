import type { ReactNode } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";

// The standard button. `workspace` paints it in the workspace's own accent colour instead of Rosterr's. `onPress` and `onClick` are
// the same thing (older code used one, newer the other).

export interface ButtonProps {
  children: ReactNode;
  /** Either handler works; `onPress` wins when both are given. */
  onPress?: () => void;
  onClick?: () => void;
  classoverride?: string;
  loading?: boolean;
  workspace?: boolean;
  compact?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

// The same look as `solidButton` in components/ui/parts.tsx: brand colour fill (text on it is picked for contrast in styles/tailwind.css),
// rounded-lg, medium weight, one hover step and the same disabled state.
const BASE = "ml-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50";
const BRAND = "bg-rosterr hover:bg-rosterr/90 focus-visible:ring-rosterr/50";
const ACCENT = "bg-primary hover:bg-primary/90 focus-visible:ring-primary/50";

export default function Button(props: ButtonProps) {
  const { children, loading, classoverride, workspace, compact, disabled, type = "button" } = props;
  const handler = props.onPress ?? props.onClick;
  const size = compact ? "px-3 py-1.5" : "px-4 py-2";
  const colour = workspace ? ACCENT : BRAND;
  return (
    <button type={type} onClick={handler} disabled={disabled} className={twMerge(BASE, size, colour, classoverride)}>
      {loading ? <IconLoader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Loading" /> : children}
    </button>
  );
}
