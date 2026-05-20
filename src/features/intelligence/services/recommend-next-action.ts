import type { Contact, FollowupCandidate } from "@/features/followups/types";
import type { Recommendation, RiskLevel } from "@/features/intelligence/types";

export interface ActionInput {
  contact: Contact;
  candidate: FollowupCandidate;
  slaDueAt?: string;
  escalationLevel: number;
  promiseDueAt?: string;
  recoveryScore: number;
  riskLevel: RiskLevel;
  lastAttemptWasRecent: boolean;
  attemptsToday: number;
}

export function recommendNextAction(input: ActionInput): Recommendation {
  const reasons: string[] = [];
  let score = 0;

  if (input.riskLevel === "critical") { score += 30; reasons.push("Critical risk contact"); }
  else if (input.riskLevel === "high") { score += 20; reasons.push("High risk contact"); }

  if (input.slaDueAt && Date.now() > new Date(input.slaDueAt).getTime()) {
    score += 35; reasons.push("SLA breached");
  }

  if (input.promiseDueAt) {
    const hoursUntilDue = (new Date(input.promiseDueAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDue < 0) { score += 30; reasons.push("Promise overdue"); }
    else if (hoursUntilDue < 24) { score += 20; reasons.push("Promise due within 24h"); }
  }

  if (input.escalationLevel > 0) {
    score += input.escalationLevel * 15;
    reasons.push(`Escalation level ${input.escalationLevel}`);
  }

  if (input.lastAttemptWasRecent && input.attemptsToday > 3) {
    reasons.push("Multiple attempts today - consider waiting");
    return {
      action: "wait",
      score: Math.min(score, 40),
      reasons,
      contactId: input.contact.id,
      candidateId: input.candidate.id,
    };
  }

  if (input.attemptsToday === 0 && input.recoveryScore > 50) {
    score += 15;
    reasons.push("Untouched today, good recovery potential");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const action: Recommendation["action"] = finalScore >= 50 ? "contact_now" : (input.escalationLevel >= 3 ? "escalate" : "wait");
  return { action, score: finalScore, reasons, contactId: input.contact.id, candidateId: input.candidate.id };
}
