import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A small label that appears beside whatever it wraps while the pointer is over it. It is drawn on the page body, so no parent's
// overflow can cut it off.

type Side = "top" | "bottom" | "left" | "right";
type Props = { children?: ReactNode; orientation: Side; tooltipText?: string; /** Sit in a line of text (a span) instead of being a block of its own. */ inline?: boolean };

const GAP = 8;

/** Where the label's anchor point is on the wrapped element's box, and how the label is shifted so that point sits on its edge. */
const PLACEMENT: Record<Side, { at: (r: DOMRect) => { top: number; left: number }; shift: string; arrow: string }> = {
  top: { at: (r) => ({ top: r.top - GAP, left: r.left + r.width / 2 }), shift: "translate(-50%, -100%)", arrow: "left-1/2 top-full -translate-x-1/2 -translate-y-1/2" },
  bottom: { at: (r) => ({ top: r.bottom + GAP, left: r.left + r.width / 2 }), shift: "translate(-50%, 0)", arrow: "bottom-full left-1/2 -translate-x-1/2 translate-y-1/2" },
  right: { at: (r) => ({ top: r.top + r.height / 2, left: r.right + GAP }), shift: "translate(0, -50%)", arrow: "right-full top-1/2 -translate-y-1/2 translate-x-1/2" },
  left: { at: (r) => ({ top: r.top + r.height / 2, left: r.left - GAP }), shift: "translate(-100%, -50%)", arrow: "left-full top-1/2 -translate-x-1/2 -translate-y-1/2" },
};

export default function Tooltip({ children, orientation, tooltipText, inline = false }: Props) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState({ top: 0, left: 0 });
  const place = PLACEMENT[orientation];

  const measure = () => {
    const box = anchor.current?.getBoundingClientRect();
    if (box) setPoint(place.at(box));
  };

  // While it is showing, follow the element if the page scrolls or resizes.
  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const style: CSSProperties = { top: point.top, left: point.left, transform: place.shift };

  return (
    <span
      ref={anchor}
      className={inline ? "relative inline-flex items-center" : "relative flex items-center"}
      onMouseEnter={() => {
        measure();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => {
        measure();
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="pointer-events-none fixed z-[9999]" style={style} role="tooltip">
            <div className="relative whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm text-white shadow-lg">
              <div className={`absolute h-2.5 w-2.5 rotate-45 bg-primary ${place.arrow}`} />
              {tooltipText}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
