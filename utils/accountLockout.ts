// Too many failed sign-ins for one account lock it for a while. Kept in memory, so it resets on a restart and isn't shared between
// servers; it slows guessing down, it isn't a record. Sign-in routes clear an account's count once the person gets in.

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 30 * 60 * 1000;

type Record = { failures: number; since: number; lockedUntil: number | null };
const records = new Map<string, Record>();

/** A record is spent once its window has passed and any lock has ended. */
const spent = (r: Record, now: number) => now - r.since > WINDOW_MS && (!r.lockedUntil || now > r.lockedUntil);

let sweeper: ReturnType<typeof setInterval> | null = null;
function sweepSoon() {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, r] of records) if (spent(r, now)) records.delete(key);
    if (!records.size && sweeper) {
      clearInterval(sweeper);
      sweeper = null;
    }
  }, 5 * 60 * 1000);
  sweeper.unref?.();
}

const keyOf = (userId: string | number) => String(userId);

export function isAccountLocked(userId: string | number): { locked: boolean; remainingMs: number } {
  const key = keyOf(userId);
  const r = records.get(key);
  const now = Date.now();
  if (r?.lockedUntil && now < r.lockedUntil) return { locked: true, remainingMs: r.lockedUntil - now };
  if (r?.lockedUntil) records.delete(key); // the lock has ended: start clean
  return { locked: false, remainingMs: 0 };
}

export function recordFailedAttempt(userId: string | number): { locked: boolean; attemptsRemaining: number; lockoutDurationMs: number } {
  const key = keyOf(userId);
  const now = Date.now();
  let r = records.get(key);
  if (!r || now - r.since > WINDOW_MS) r = { failures: 0, since: now, lockedUntil: null };
  r.failures += 1;
  records.set(key, r);
  sweepSoon();

  if (r.failures >= MAX_FAILURES) {
    r.lockedUntil = now + LOCK_MS;
    console.warn(`[System] Account ${key} locked after ${r.failures} failed attempts`);
    return { locked: true, attemptsRemaining: 0, lockoutDurationMs: LOCK_MS };
  }
  return { locked: false, attemptsRemaining: MAX_FAILURES - r.failures, lockoutDurationMs: 0 };
}

export function clearLoginAttempts(userId: string | number): void {
  records.delete(keyOf(userId));
}

export function getFailedAttemptCount(userId: string | number): number {
  const key = keyOf(userId);
  const r = records.get(key);
  if (!r) return 0;
  if (Date.now() - r.since > WINDOW_MS) {
    records.delete(key);
    return 0;
  }
  return r.failures;
}
