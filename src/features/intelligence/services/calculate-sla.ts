import type { CandidatePriority } from "@/features/followups/types";

const SLA_WINDOW_HOURS: Record<CandidatePriority, number> = {
  high: 4,
  medium: 24,
  low: 72,
};

export function calculateSlaDueAt(priority: CandidatePriority, generatedAt: string): string {
  const generated = new Date(generatedAt).getTime();
  const hours = SLA_WINDOW_HOURS[priority];
  return new Date(generated + hours * 60 * 60 * 1000).toISOString();
}

export function getSlaWindowHours(priority: CandidatePriority): number {
  return SLA_WINDOW_HOURS[priority];
}

export function getSlaStatus(slaDueAt: string): {
  status: "ok" | "warning" | "breached";
  remainingMs: number;
  label: string;
} {
  const now = Date.now();
  const due = new Date(slaDueAt).getTime();
  const remaining = due - now;
  if (remaining < 0) return { status: "breached", remainingMs: remaining, label: "SLA Breached" };
  if (remaining < 60 * 60 * 1000) return { status: "warning", remainingMs: remaining, label: "SLA At Risk" };
  return { status: "ok", remainingMs: remaining, label: "SLA OK" };
}
