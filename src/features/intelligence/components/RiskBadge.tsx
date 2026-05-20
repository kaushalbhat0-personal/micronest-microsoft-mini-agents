import type { RiskLevel } from "@/features/intelligence/types";

interface RiskBadgeProps {
  level: RiskLevel;
}

const riskColors: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${riskColors[level]}`}>
      {level}
    </span>
  );
}
