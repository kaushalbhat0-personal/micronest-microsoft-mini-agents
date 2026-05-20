import type { RiskLevel } from "@/features/intelligence/types";

export interface RecoveryScoreInput {
  engagementCount: number;
  hasPartialPayment: boolean;
  dueAmount: number | null;
  paidAmount: number | null;
  totalAmount: number | null;
  promiseCount: number;
  brokenPromiseCount: number;
  hoursSinceLastActivity: number;
  followupCount: number;
}

export function calculateRecoveryScore(input: RecoveryScoreInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50;

  const paymentRatio = input.paidAmount != null && input.totalAmount != null && input.totalAmount > 0
    ? input.paidAmount / input.totalAmount
    : 0;
  if (paymentRatio > 0.5) { score += 15; reasons.push("Over 50% already paid"); }
  else if (paymentRatio > 0.25) { score += 8; reasons.push("Partial payment made"); }
  else { score -= 5; reasons.push("No significant payment"); }

  if (input.brokenPromiseCount === 0 && input.promiseCount > 0) { score += 15; reasons.push("Kept all promises"); }
  else if (input.brokenPromiseCount > 0) {
    const ratio = input.brokenPromiseCount / input.promiseCount;
    if (ratio > 0.5) { score -= 20; reasons.push(`Broken ${input.brokenPromiseCount} of ${input.promiseCount} promises`); }
    else { score -= 10; reasons.push("Some broken promises"); }
  }

  if (input.hoursSinceLastActivity < 24) { score += 10; reasons.push("Recent activity"); }
  else if (input.hoursSinceLastActivity > 168) { score -= 10; reasons.push("No activity in over a week"); }
  else if (input.hoursSinceLastActivity > 72) { score -= 5; reasons.push("No recent activity"); }

  if (input.followupCount > 5) { score += 5; reasons.push("Consistent follow-ups"); }
  if (input.engagementCount > 3) { score += 5; reasons.push("High engagement"); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons };
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "low";
  if (score >= 40) return "medium";
  if (score >= 20) return "high";
  return "critical";
}
