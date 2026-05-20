export interface PromiseCheckResult {
  isBroken: boolean;
  hoursOverdue: number;
  daysOverdue: number;
}

export function detectBrokenPromise(contact: { promise_due_at?: string | null }): PromiseCheckResult | null {
  if (!contact.promise_due_at) return null;
  const now = Date.now();
  const due = new Date(contact.promise_due_at).getTime();
  if (now <= due) return null;
  const hoursOverdue = (now - due) / (1000 * 60 * 60);
  const daysOverdue = hoursOverdue / 24;
  return { isBroken: true, hoursOverdue, daysOverdue: Math.floor(daysOverdue) };
}

export function hasActivePromise(promiseDueAt: string | null): boolean {
  if (!promiseDueAt) return false;
  return Date.now() < new Date(promiseDueAt).getTime();
}
