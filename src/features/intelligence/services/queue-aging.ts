import type { AgingBucket } from "@/features/intelligence/types";

const AGING_THRESHOLDS: Record<AgingBucket, { minHours: number; maxHours: number; score: number; label: string }> = {
  fresh: { minHours: 0, maxHours: 24, score: 0, label: "Fresh" },
  aging: { minHours: 24, maxHours: 72, score: 20, label: "Aging" },
  stale: { minHours: 72, maxHours: 168, score: 40, label: "Stale" },
  critical: { minHours: 168, maxHours: Infinity, score: 60, label: "Critical" },
};

export function calculateAgingBucket(generatedAt: string): { bucket: AgingBucket; hoursSinceGeneration: number } {
  const now = Date.now();
  const generated = new Date(generatedAt).getTime();
  const hoursSinceGeneration = (now - generated) / (1000 * 60 * 60);

  if (hoursSinceGeneration >= AGING_THRESHOLDS.critical.minHours) return { bucket: "critical", hoursSinceGeneration };
  if (hoursSinceGeneration >= AGING_THRESHOLDS.stale.minHours) return { bucket: "stale", hoursSinceGeneration };
  if (hoursSinceGeneration >= AGING_THRESHOLDS.aging.minHours) return { bucket: "aging", hoursSinceGeneration };
  return { bucket: "fresh", hoursSinceGeneration };
}

export function getAgingScore(bucket: AgingBucket): number {
  return AGING_THRESHOLDS[bucket]?.score ?? 0;
}

export function getAgingBuckets(): Record<string, { score: number; label: string }> {
  const result: Record<string, { score: number; label: string }> = {};
  for (const [key, val] of Object.entries(AGING_THRESHOLDS)) {
    result[key] = { score: val.score, label: val.label };
  }
  return result;
}
