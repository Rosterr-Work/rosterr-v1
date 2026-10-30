// The title given to a session that starts on its own when someone begins playing (an "unscheduled" session): a line about the time
// of day and the game, so the Sessions list reads like a log rather than a column of identical names.

export type TimeOfDay = "morning" | "afternoon" | "evening" | "lateNight";

const TITLES: Record<TimeOfDay, ((game: string) => string)[]> = {
  morning: [
    (g) => `A morning in ${g}`,
    (g) => `Morning shift in ${g}`,
    (g) => `Dawn patrol in ${g}`,
    (g) => `Early bird session in ${g}`,
    (g) => `First light in ${g}`,
    (g) => `Sunrise session in ${g}`,
    (g) => `Morning mission in ${g}`,
  ],
  afternoon: [
    (g) => `Afternoon in ${g}`,
    (g) => `Midday mission in ${g}`,
    (g) => `Lunch break in ${g}`,
    (g) => `Afternoon shift in ${g}`,
    (g) => `Daytime duty in ${g}`,
    (g) => `Midday momentum in ${g}`,
    (g) => `Sunny session in ${g}`,
  ],
  evening: [
    (g) => `Evening in ${g}`,
    (g) => `Night shift in ${g}`,
    (g) => `Twilight session in ${g}`,
    (g) => `After hours in ${g}`,
    (g) => `Sunset session in ${g}`,
    (g) => `Night owl session in ${g}`,
    (g) => `Late shift in ${g}`,
  ],
  lateNight: [
    (g) => `Midnight mission in ${g}`,
    (g) => `Late night in ${g}`,
    (g) => `After midnight in ${g}`,
    (g) => `Nocturnal session in ${g}`,
    (g) => `Sleepless session in ${g}`,
    (g) => `The small hours in ${g}`,
  ],
};

/** 4–11 morning, 12–19 afternoon, 20 to midnight evening (22–1 counts as late night), 2–3 evening-ish "after hours". */
export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 22 || hour < 2) return "lateNight";
  if (hour >= 20 || hour < 4) return "evening";
  if (hour >= 12) return "afternoon";
  return "morning";
}

export function generateSessionTimeMessage(gameName: string | null, start: Date, random: () => number = Math.random): string {
  const options = TITLES[timeOfDay(start.getHours())];
  const pick = options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  return pick(gameName || "Roblox");
}
