import type { OperationalQueueItem, CandidatePriority } from "@/features/followups/types";
import type { AgingBucket, RiskLevel } from "@/features/intelligence/types";

interface PrioritizationInput {
  items: OperationalQueueItem[];
  intelligenceMap: Map<string, {
    slaDueAt?: string;
    escalationLevel: number;
    promiseDueAt?: string;
    recoveryScore: number;
    riskLevel: RiskLevel;
    agingBucket: AgingBucket;
    intelligenceScore: number;
  }>;
}

export function prioritizeQueueV2(input: PrioritizationInput): OperationalQueueItem[] {
  const scored = input.items.map((item) => {
    const meta = input.intelligenceMap.get(item.candidate.id);
    let score = 0;
    if (meta) {
      const priorityScores: Record<CandidatePriority, number> = { high: 10000, medium: 5000, low: 0 };
      score += priorityScores[item.candidate.priority] ?? 0;
      if (meta.slaDueAt && Date.now() > new Date(meta.slaDueAt).getTime()) score += 8000;
      score += meta.escalationLevel * 1000;
      const agingBonus: Record<AgingBucket, number> = { fresh: 0, aging: 2000, stale: 4000, critical: 6000 };
      score += agingBonus[meta.agingBucket] ?? 0;
      score += Math.round((100 - meta.recoveryScore) * 30);
      if (meta.promiseDueAt) {
        const hoursUntilDue = (new Date(meta.promiseDueAt).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilDue < 0) score += 5000;
        else if (hoursUntilDue < 24) score += 3000;
      }
      const riskBonus: Record<RiskLevel, number> = { low: 0, medium: 1000, high: 3000, critical: 5000 };
      score += riskBonus[meta.riskLevel] ?? 0;
    }
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score || new Date(a.item.candidate.generated_at).getTime() - new Date(b.item.candidate.generated_at).getTime());
  return scored.map((s) => s.item);
}
