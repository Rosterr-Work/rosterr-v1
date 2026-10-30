// When several containers run the same app, the role sync is split into batches so they don't all hit Roblox at once: the day is
// cut into two-hour cycles of eight fifteen-minute slots, numbered 1 to 8 (UTC).

const SLOT_MINUTES = 15;
const CYCLE_MINUTES = 120;

export const multiContainer = (): boolean => process.env.NEXT_MULTI?.toLowerCase() === "true";

/** The batch (1–8) a moment falls in. */
export function batchAt(now: Date = new Date()): number {
  const minutesIntoDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  return Math.floor((minutesIntoDay % CYCLE_MINUTES) / SLOT_MINUTES) + 1;
}

export const getCurrentBatch = (): number => batchAt();

/** The batch this container should run, or null when there is only one container (it runs everything). */
export const getActiveBatch = (): number | null => (multiContainer() ? batchAt() : null);

export function logBatchSchedule(): void {
  console.log(`[BATCH-SCHEDULER] ${new Date().toISOString()} batch ${batchAt()} (multi-container: ${multiContainer()})`);
}
