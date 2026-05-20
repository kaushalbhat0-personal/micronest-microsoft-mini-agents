import type { OperatorLoad } from "@/features/intelligence/types";

const MAX_OPTIMAL_LOAD = 30;
const OVERLOAD_THRESHOLD = 50;

export function calculateOperatorLoad(params: {
  assignedCount: number;
  activeSessions: number;
  overdueCount: number;
  slaBurden: number;
}): OperatorLoad {
  const totalScore = params.assignedCount * 1 + params.activeSessions * 3 + params.overdueCount * 2 + params.slaBurden * 4;
  return { userId: "", ...params, totalScore };
}

export function recommendReassignment(loads: OperatorLoad[]): Array<{
  fromUserId: string;
  toUserId: string;
  reason: string;
  count: number;
}> {
  const recommendations: Array<{ fromUserId: string; toUserId: string; reason: string; count: number }> = [];
  const sorted = [...loads].sort((a, b) => b.totalScore - a.totalScore);
  const overloaded = sorted.filter((l) => l.totalScore > OVERLOAD_THRESHOLD);
  const underloaded = sorted.filter((l) => l.totalScore < MAX_OPTIMAL_LOAD && l.totalScore > 0);
  if (overloaded.length === 0 || underloaded.length === 0) return [];
  for (const overload of overloaded) {
    for (const underload of underloaded) {
      const transferCount = Math.min(
        Math.floor((overload.totalScore - OVERLOAD_THRESHOLD) / 2),
        Math.floor((MAX_OPTIMAL_LOAD - underload.totalScore) / 2),
        Math.max(1, Math.floor(overload.assignedCount * 0.2))
      );
      if (transferCount > 0) {
        recommendations.push({
          fromUserId: overload.userId,
          toUserId: underload.userId,
          reason: `${overload.userId} overloaded (${overload.totalScore}) → ${underload.userId} has capacity (${underload.totalScore})`,
          count: transferCount,
        });
      }
    }
  }
  return recommendations;
}

export function isOverloaded(load: OperatorLoad): boolean {
  return load.totalScore > OVERLOAD_THRESHOLD;
}

export function getOperatorLoadLabel(load: OperatorLoad): "underloaded" | "optimal" | "loaded" | "overloaded" {
  if (load.totalScore <= 0) return "underloaded";
  if (load.totalScore <= MAX_OPTIMAL_LOAD) return "optimal";
  if (load.totalScore <= OVERLOAD_THRESHOLD) return "loaded";
  return "overloaded";
}
