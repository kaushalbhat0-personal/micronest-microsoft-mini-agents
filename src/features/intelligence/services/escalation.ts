import type { EscalationTrigger } from "@/features/intelligence/types";

const ESCALATION_REASONS: Record<EscalationTrigger, string> = {
  followup_ignored: "Repeated follow-ups ignored",
  sla_breach: "SLA deadline breached",
  promise_broken: "Promise was broken",
  repeated_failure: "Repeated delivery failures",
  inactive_ownership: "No activity from assigned operator",
};

const MAX_ESCALATION_LEVEL = 5;

export function shouldEscalate(
  currentLevel: number,
  trigger: EscalationTrigger,
  triggerCount: number
): { escalate: boolean; newLevel: number; reason: string } {
  if (currentLevel >= MAX_ESCALATION_LEVEL) return { escalate: false, newLevel: currentLevel, reason: "Already at max escalation" };
  if (trigger === "sla_breach") return { escalate: true, newLevel: Math.min(currentLevel + 2, MAX_ESCALATION_LEVEL), reason: ESCALATION_REASONS[trigger] };
  if (trigger === "promise_broken") return { escalate: true, newLevel: Math.min(currentLevel + 1, MAX_ESCALATION_LEVEL), reason: ESCALATION_REASONS[trigger] };
  if (trigger === "followup_ignored" && triggerCount >= 3) return { escalate: true, newLevel: Math.min(currentLevel + 1, MAX_ESCALATION_LEVEL), reason: ESCALATION_REASONS[trigger] };
  if (trigger === "repeated_failure" && triggerCount >= 3) return { escalate: true, newLevel: Math.min(currentLevel + 2, MAX_ESCALATION_LEVEL), reason: ESCALATION_REASONS[trigger] };
  if (trigger === "inactive_ownership" && triggerCount >= 1) return { escalate: true, newLevel: Math.min(currentLevel + 1, MAX_ESCALATION_LEVEL), reason: ESCALATION_REASONS[trigger] };
  return { escalate: false, newLevel: currentLevel, reason: "No escalation needed" };
}

export function getEscalationLabel(level: number): string {
  if (level === 0) return "Normal";
  if (level <= 2) return "Monitoring";
  if (level <= 4) return "Elevated";
  return "Critical";
}

export { MAX_ESCALATION_LEVEL };
