import type { Contact, FollowupCandidate, OperationalQueueItem, CandidatePriority } from "@/features/followups/types";
import type { Recommendation, AgingBucket, RiskLevel } from "@/features/intelligence/types";

const PRIORITY_SCORES: Record<CandidatePriority, number> = { high: 30, medium: 15, low: 0 };

export interface ScoringInput {
  candidate: FollowupCandidate;
  contact: Contact;
  pledge: {
    slaDueAt?: string;
    escalationLevel: number;
    promiseDueAt?: string;
    lastPromiseBrokenAt?: string;
    recoveryScore: number;
    riskLevel: RiskLevel;
    agingBucket: AgingBucket;
  };
}

export function scoreContact(input: ScoringInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  score += PRIORITY_SCORES[input.candidate.priority];
  reasons.push(`Priority: ${input.candidate.priority}`);

  const slaStatus = input.pledge.slaDueAt
    ? (Date.now() > new Date(input.pledge.slaDueAt).getTime() ? "breached" : "ok")
    : "none";
  if (slaStatus === "breached") { score += 40; reasons.push("SLA breached"); }

  score += input.pledge.escalationLevel * 10;
  if (input.pledge.escalationLevel > 0) reasons.push(`Escalation level ${input.pledge.escalationLevel}`);

  const agingScores: Record<AgingBucket, number> = { fresh: 0, aging: 10, stale: 25, critical: 40 };
  score += agingScores[input.pledge.agingBucket] ?? 0;
  if (input.pledge.agingBucket !== "fresh") reasons.push(`Queue: ${input.pledge.agingBucket}`);

  const recoveryWeight = Math.round((100 - input.pledge.recoveryScore) * 0.3);
  score += recoveryWeight;
  if (input.pledge.recoveryScore < 40) reasons.push("Low recovery score");

  if (input.pledge.promiseDueAt) {
    const hoursUntilDue = (new Date(input.pledge.promiseDueAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDue < 0) { score += 25; reasons.push("Promise overdue"); }
    else if (hoursUntilDue < 24) { score += 15; reasons.push("Promise due soon"); }
  }

  const amount = input.contact.due_amount ?? 0;
  if (amount > 10000) { score += 15; reasons.push(`High amount: ${amount}`); }
  else if (amount > 5000) { score += 8; reasons.push(`Medium amount: ${amount}`); }

  if (input.pledge.riskLevel === "critical") { score += 20; reasons.push("Critical risk"); }
  else if (input.pledge.riskLevel === "high") { score += 10; reasons.push("High risk"); }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return { score: finalScore, reasons };
}

export function recommendNextContact(items: OperationalQueueItem[], scoringFn: (item: OperationalQueueItem) => ScoringInput): Recommendation | null {
  if (items.length === 0) return null;
  const scored = items.map((item) => {
    const scoringInput = scoringFn(item);
    const { score, reasons } = scoreContact(scoringInput);
    return { item, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score || new Date(a.item.candidate.generated_at).getTime() - new Date(b.item.candidate.generated_at).getTime());
  const best = scored[0];
  return {
    action: best.score >= 50 ? "contact_now" : "wait",
    score: best.score,
    reasons: best.reasons,
    contactId: best.item.contact.id,
    candidateId: best.item.candidate.id,
  };
}
