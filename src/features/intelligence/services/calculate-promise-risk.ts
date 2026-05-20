export interface PromiseRiskInput {
  promiseDueAt: string | null;
  lastPromiseBrokenAt: string | null;
  totalPromises: number;
  brokenPromises: number;
  recoveryScore: number;
}

export function calculatePromiseRisk(input: PromiseRiskInput): {
  risk: "none" | "due_soon" | "overdue" | "at_risk" | "broken";
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (!input.promiseDueAt) return { risk: "none", score: 0, reasons: ["No active promise"] };

  const now = Date.now();
  const due = new Date(input.promiseDueAt).getTime();
  const hoursUntilDue = (due - now) / (1000 * 60 * 60);

  if (now > due) {
    const daysOverdue = Math.abs(hoursUntilDue) / 24;
    score = Math.min(100, Math.round(daysOverdue * 15 + input.brokenPromises * 10));
    reasons.push(`Promise overdue by ${Math.round(daysOverdue)} day(s)`);
    if (input.brokenPromises > 0) reasons.push(`${input.brokenPromises} previous broken promise(s)`);
    return { risk: "overdue", score, reasons };
  }

  if (hoursUntilDue < 24) {
    score = 60;
    reasons.push("Promise due within 24 hours");
    if (input.brokenPromises > 0) reasons.push("History of broken promises");
    return { risk: "due_soon", score, reasons };
  }

  if (hoursUntilDue < 72) {
    score = 30;
    reasons.push("Promise due within 3 days");
    return { risk: "at_risk", score, reasons };
  }

  return { risk: "none", score: 0, reasons: ["Promise on track"] };
}

export function isPromiseOverdue(promiseDueAt: string): boolean {
  return Date.now() > new Date(promiseDueAt).getTime();
}

export function hasRepeatedBrokenPromises(brokenPromises: number): boolean {
  return brokenPromises >= 2;
}
