// The greeting on the home page, picked to suit the time of day. (Seasonal greetings, when there's a season on, are in utils/seasons.ts.)

export type DayPart = "morning" | "afternoon" | "evening" | "lateNight";

const GREETINGS: Record<DayPart, ((name: string) => string)[]> = {
  morning: [
    (n) => `Good morning, ${n}`,
    (n) => `Morning, ${n}`,
    (n) => `Welcome back, ${n}`,
    (n) => `Here's your day, ${n}`,
    (n) => `Hi ${n}, here's what's on today`,
  ],
  afternoon: [
    (n) => `Good afternoon, ${n}`,
    (n) => `Afternoon, ${n}`,
    (n) => `Welcome back, ${n}`,
    (n) => `Here's where things stand, ${n}`,
    (n) => `Hi ${n}, here's the rest of today`,
  ],
  evening: [
    (n) => `Good evening, ${n}`,
    (n) => `Evening, ${n}`,
    (n) => `Welcome back, ${n}`,
    (n) => `Here's the recap, ${n}`,
    (n) => `Hi ${n}, here's how today went`,
  ],
  lateNight: [
    (n) => `Late one, ${n}`,
    (n) => `Still working, ${n}?`,
    (n) => `Welcome back, ${n}`,
    (n) => `Here's where things stand, ${n}`,
    (n) => `Hi ${n}, this can wait until morning`,
  ],
};

/** 4–11 morning, 12–19 afternoon, 20–23 evening, midnight to 3 late night. */
export function dayPart(hour: number): DayPart {
  if (hour >= 20) return "evening";
  if (hour >= 12) return "afternoon";
  if (hour >= 4) return "morning";
  return "lateNight";
}

export function greeting(name: string, hour: number = new Date().getHours(), random: () => number = Math.random): string {
  const options = GREETINGS[dayPart(hour)];
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))](name);
}

export default (name: string) => greeting(name);
