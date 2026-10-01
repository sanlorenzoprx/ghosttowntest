/**
 * One-at-a-time progress saves for the 30-day Sprint pages.
 *
 * Saves are whole progress snapshots. Sent concurrently, an older request can
 * finish last and its response can overwrite newer local state. This queue
 * sends one request at a time, coalesces snapshots made while a request is in
 * flight (latest wins), carries explicit day completion changes so the server
 * never infers a reopen from a missing day, and applies a response only when no
 * newer snapshot is waiting.
 */
export interface CompletedDayChange { dayNumber: number; completed: boolean }

export interface ProgressSaveQueue<P> {
  /** Resolves true once this snapshot (or a newer one that replaced it) is saved. */
  save(next: P, dayChange?: CompletedDayChange): Promise<boolean>;
}

export function createProgressSaveQueue<P>(
  send: (snapshot: P, dayChanges: CompletedDayChange[]) => Promise<P>,
  handlers: { applied: (saved: P) => void; failed: (error: unknown) => void }
): ProgressSaveQueue<P> {
  let pending: P | null = null;
  let dayChanges: CompletedDayChange[] = [];
  let waiters: Array<(ok: boolean) => void> = [];
  let inFlight = false;

  const drain = async () => {
    inFlight = true;
    try {
      while (pending !== null) {
        const snapshot = pending;
        const changes = dayChanges;
        const settle = waiters;
        pending = null;
        dayChanges = [];
        waiters = [];
        try {
          const saved = await send(snapshot, changes);
          if (pending === null) handlers.applied(saved);
          settle.forEach(resolve => resolve(true));
        } catch (error) {
          // Keep unsent completion changes for the next save or retry.
          dayChanges = [...changes, ...dayChanges];
          handlers.failed(error);
          settle.forEach(resolve => resolve(false));
        }
      }
    } finally {
      inFlight = false;
    }
  };

  return {
    save(next, dayChange) {
      pending = next;
      if (dayChange) dayChanges.push(dayChange);
      const done = new Promise<boolean>(resolve => waiters.push(resolve));
      if (!inFlight) void drain();
      return done;
    }
  };
}

/**
 * The day the structured workspace works on: the day the customer opened it
 * for, otherwise the first incomplete day. Passing the day explicitly means a
 * completion that has not reached this snapshot yet cannot retag evidence or a
 * checkpoint review to the previous day.
 */
export function workspaceActionDay(
  dayNumbers: number[],
  completedDays: number[] | undefined,
  requestedDay?: number | null
): number {
  if (requestedDay && dayNumbers.includes(requestedDay)) return requestedDay;
  const completed = new Set(completedDays || []);
  return dayNumbers.find(day => !completed.has(day)) ?? dayNumbers[dayNumbers.length - 1];
}
