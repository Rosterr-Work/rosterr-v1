import { IconHeartHandshake } from "@tabler/icons-react";
import type { SVGProps } from "react";
import { ORG_BADGE_DESCRIPTION, ORG_BADGE_LABEL, type OrgBadgeName } from "@/utils/orgBadge";

// Verified is Cobalt, the palette's status colour (brand guidelines, Colour). Its lighter shade is for dark surfaces, where Cobalt itself is too dim.
const COBALT = "#3b4bff";
const COBALT_LIGHT = "#8a94ff";

/** A hexagon with a tick: Verified. Drawn on a 24-unit grid like the icon set, filled with the current text colour. */
function VerifiedHexagon({ onDark, title, ...rest }: SVGProps<SVGSVGElement> & { onDark?: boolean; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" {...rest}>
      {title && <title>{title}</title>}
      <polygon points="12,2.6 20.1,7.3 20.1,16.7 12,21.4 3.9,16.7 3.9,7.3" fill="currentColor" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M8.6 12.4l2.4 2.4 4.4-4.6" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={onDark ? "stroke-[#101450]" : "stroke-white dark:stroke-[#101450]"} />
    </svg>
  );
}

/** The mark next to a workspace's name: a Cobalt hexagon tick for Verified, a pink heart and handshake for Partner. Nothing for no badge. */
export function OrgBadge({
  badge,
  className = "w-5 h-5",
  withLabel = false,
  onDark = false,
}: {
  badge: OrgBadgeName | null | undefined;
  className?: string;
  /** A pill with the name beside the icon, for places with room, such as headers and the platform portal. */
  withLabel?: boolean;
  /** The surface is always dark, whatever the theme (the public careers pages), so use the colours made for dark. */
  onDark?: boolean;
}) {
  if (!badge) return null;
  const partner = badge === "PARTNER";
  const title = `${ORG_BADGE_LABEL[badge]}: ${ORG_BADGE_DESCRIPTION[badge]}`;
  const verifiedColour = onDark ? "text-[#8a94ff]" : "text-[#3b4bff] dark:text-[#8a94ff]";
  const colour = partner ? "text-magenta" : verifiedColour;

  if (withLabel) {
    const pill = onDark
      ? partner ? "bg-magenta/20 text-magenta-300" : "bg-[#8a94ff]/20 text-[#c3c8ff]"
      : partner ? "bg-magenta/10 text-magenta-deep dark:bg-magenta/15 dark:text-magenta-300" : "bg-[#3b4bff]/10 text-[#2632d9] dark:bg-[#8a94ff]/15 dark:text-[#c3c8ff]";
    return (
      <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${pill}`}>
        {partner ? <IconHeartHandshake stroke={2.4} className={`h-4 w-4 flex-shrink-0 ${colour}`} aria-hidden /> : <VerifiedHexagon onDark={onDark} className={`h-4 w-4 flex-shrink-0 ${colour}`} aria-hidden />}
        {ORG_BADGE_LABEL[badge]}
      </span>
    );
  }
  return partner
    ? <IconHeartHandshake stroke={2.4} className={`${colour} block flex-shrink-0 scale-[1.12] ${className}`} aria-label={ORG_BADGE_LABEL[badge]} title={title} />
    : <VerifiedHexagon onDark={onDark} role="img" title={title} className={`${colour} block flex-shrink-0 ${className}`} aria-label={ORG_BADGE_LABEL[badge]} />;
}

export default function VerifiedBadge({ className = "w-5 h-5" }: { className?: string }) {
  return <OrgBadge badge="VERIFIED" className={className} />;
}
