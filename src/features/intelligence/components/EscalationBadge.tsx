interface EscalationBadgeProps {
  level: number;
}

const colors: Record<number, string> = {
  0: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  1: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  3: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  4: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  5: "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
};

export function EscalationBadge({ level }: EscalationBadgeProps) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors[level] ?? colors[0]}`}>
      E{level}
    </span>
  );
}
