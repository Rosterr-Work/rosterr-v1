// Time zones by area (UTC offset), as people pick them in their profile: "UTC+05:30 (IST)". Each has the IANA zone used to show times
// in it. Older profiles saved a place name ("America/New_York"); `convertLegacyTimezone` maps those to the closest area.

export interface TimezoneOption {
  label: string;
  /** Hours from UTC (east is positive). */
  offset: number;
  abbreviations: string[];
  /** The IANA zone used to display times in this area. */
  iana: string;
}

const zone = (label: string, offset: number, iana: string, ...abbreviations: string[]): TimezoneOption => ({ label, offset, abbreviations, iana });

export const areaBasedTimezones: TimezoneOption[] = [
  zone("UTC-12:00", -12, "Etc/GMT+12"),
  zone("UTC-11:00 (SST)", -11, "Pacific/Pago_Pago", "SST"),
  zone("UTC-10:00 (HST)", -10, "Pacific/Honolulu", "HST"),
  zone("UTC-09:00 (AKST)", -9, "America/Anchorage", "AKST"),
  zone("UTC-08:00 (PST)", -8, "America/Los_Angeles", "PST", "PT"),
  zone("UTC-07:00 (MST)", -7, "America/Denver", "MST", "MT", "PDT"),
  zone("UTC-06:00 (CST)", -6, "America/Chicago", "CST", "CT", "MDT"),
  zone("UTC-05:00 (EST)", -5, "America/New_York", "EST", "ET", "CDT"),
  zone("UTC-04:00 (EDT)", -4, "America/New_York", "EDT", "AST"),
  zone("UTC-03:00 (ART)", -3, "America/Argentina/Buenos_Aires", "ART", "BRT"),
  zone("UTC-02:00", -2, "Etc/GMT+2"),
  zone("UTC-01:00", -1, "Atlantic/Azores", "AZOT"),
  zone("UTC±00:00 (GMT)", 0, "Europe/London", "GMT", "UTC", "WET"),
  zone("UTC+01:00 (CET)", 1, "Europe/Paris", "CET", "WET", "IST"),
  zone("UTC+02:00 (EET)", 2, "Europe/Helsinki", "EET", "CAT", "SAST"),
  zone("UTC+03:00 (EAT)", 3, "Africa/Nairobi", "EAT", "MSK"),
  zone("UTC+04:00 (GST)", 4, "Asia/Dubai", "GST", "AMT"),
  zone("UTC+05:00 (PKT)", 5, "Asia/Karachi", "PKT", "YEKT"),
  zone("UTC+05:30 (IST)", 5.5, "Asia/Kolkata", "IST"),
  zone("UTC+06:00 (BST)", 6, "Asia/Dhaka", "BST", "OMST"),
  zone("UTC+07:00 (ICT)", 7, "Asia/Bangkok", "ICT", "WIB", "KRAT"),
  zone("UTC+08:00 (CST)", 8, "Asia/Shanghai", "CST", "SGT", "PHT", "IRKT"),
  zone("UTC+09:00 (JST)", 9, "Asia/Tokyo", "JST", "KST", "YAKT"),
  zone("UTC+10:00 (AEST)", 10, "Australia/Sydney", "AEST", "VLAT"),
  zone("UTC+11:00", 11, "Pacific/Guadalcanal", "MAGT"),
  zone("UTC+12:00 (NZST)", 12, "Pacific/Auckland", "NZST"),
];

/** The browser's offset from UTC in hours (east is positive). */
export const getBrowserTimezoneOffset = (): number => -new Date().getTimezoneOffset() / 60;

export function findClosestTimezone(offset: number): TimezoneOption {
  return areaBasedTimezones.reduce((best, tz) => (Math.abs(tz.offset - offset) < Math.abs(best.offset - offset) ? tz : best));
}

/** The area closest to the browser's own time zone. */
export const detectUserTimezone = (): TimezoneOption => findClosestTimezone(getBrowserTimezoneOffset());

export const formatTimezoneDisplay = (timezone: string | null | undefined): string => timezone || "Not set";

/** The offset in a label such as "UTC+05:30 (IST)" or "UTC±00:00 (GMT)", in hours. */
export function parseTimezoneOffset(label: string): number {
  const m = label.match(/UTC([±+\-])(\d{1,2}):?(\d{0,2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60);
}

const LEGACY_OFFSETS: Record<string, number> = {
  UTC: 0, GMT: 0,
  "America/New_York": -5, "America/Chicago": -6, "America/Denver": -7, "America/Los_Angeles": -8, "America/Toronto": -5, "America/Vancouver": -8,
  "Europe/London": 0, "Europe/Paris": 1, "Europe/Berlin": 1, "Europe/Madrid": 1, "Europe/Rome": 1,
  "Asia/Dubai": 4, "Asia/Kolkata": 5.5, "Asia/Singapore": 8, "Asia/Tokyo": 9, "Asia/Shanghai": 8,
  "Australia/Sydney": 10, "Pacific/Auckland": 12,
};

/** The area for an older, place-based zone ("America/New_York"); UTC when it isn't one we know. */
export function convertLegacyTimezone(locationTimezone: string): string {
  const offset = LEGACY_OFFSETS[locationTimezone];
  return offset === undefined ? "UTC±00:00 (GMT)" : findClosestTimezone(offset).label;
}

export const getTimezoneOptions = (): string[] => areaBasedTimezones.map((tz) => tz.label);
export const isValidTimezone = (label: string): boolean => areaBasedTimezones.some((tz) => tz.label === label);

/** The IANA zone for an area label, which is what `toLocaleString` understands; null when the label isn't one of ours. */
export const areaBasedToIANATimezone = (label: string): string | null => areaBasedTimezones.find((tz) => tz.label === label)?.iana ?? null;
