import type { LifecycleStatus } from "@/features/followups/types";

const VALID_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  pending: ["opened", "contacted", "dismissed", "ignored"],
  opened: ["contacted", "responded", "promised", "resolved", "dismissed", "ignored"],
  contacted: ["responded", "promised", "resolved", "dismissed", "ignored"],
  responded: ["promised", "resolved", "dismissed", "ignored"],
  promised: ["resolved", "dismissed", "ignored"],
  resolved: [],
  dismissed: [],
  ignored: [],
};

export function canTransition(
  current: LifecycleStatus,
  next: LifecycleStatus
): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getAvailableTransitions(current: LifecycleStatus): LifecycleStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

export function getEventTypeForTransition(
  current: LifecycleStatus,
  next: LifecycleStatus
): string | null {
  if (!canTransition(current, next)) return null;
  if (next === "dismissed") return "followup_dismissed";
  if (next === "ignored") return "marked_ignored";
  if (next === "resolved") return "marked_resolved";
  if (next === "contacted") return "followup_contacted";
  if (next === "responded") return "customer_responded";
  if (next === "promised") return "payment_promised";
  if (next === "opened") return "whatsapp_opened";
  return null;
}
