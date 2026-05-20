"use client";

import { useState, useEffect } from "react";
import { getOperatorMetrics } from "@/features/workspaces/services/get-operator-metrics";
import type { OperatorMetrics } from "@/features/workspaces/services/get-operator-metrics";

interface OperatorMetricsProps {
  workspaceId: string;
  userId: string;
}

const emptyMetrics: OperatorMetrics = {
  assignedContacts: 0,
  activeFollowups: 0,
  overduePromises: 0,
  resolvedToday: 0,
  activeSessions: 0,
};

export function OperatorMetrics({ workspaceId }: OperatorMetricsProps) {
  const [metrics, setMetrics] = useState<OperatorMetrics>(emptyMetrics);

  useEffect(() => {
    getOperatorMetrics(workspaceId).then(setMetrics);
  }, [workspaceId]);

  const items = [
    { label: "Assigned", value: metrics.assignedContacts, className: "" },
    { label: "Active", value: metrics.activeFollowups, className: "" },
    {
      label: "Overdue",
      value: metrics.overduePromises,
      className: metrics.overduePromises > 0 ? "text-red-600 dark:text-red-400" : "",
    },
    {
      label: "Resolved",
      value: metrics.resolvedToday,
      className: "text-green-600 dark:text-green-400",
    },
    { label: "Sessions", value: metrics.activeSessions, className: "" },
  ];

  return (
    <div className="flex items-center gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <span className={`text-lg font-bold tabular-nums ${item.className}`}>
            {item.value}
          </span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
