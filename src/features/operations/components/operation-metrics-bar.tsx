"use client";

import { useState, useEffect } from "react";
import { Users, AlertTriangle, IndianRupee, CheckCircle, Phone } from "lucide-react";
import { getQueueMetrics } from "@/features/operations/services/get-queue-metrics";
import type { QueueMetrics } from "@/features/operations/services/get-queue-metrics";

export function OperationMetricsBar() {
  const [metrics, setMetrics] = useState<QueueMetrics>({
    activeCount: 0,
    overdueCount: 0,
    promisedToday: 0,
    contactedToday: 0,
    totalOutstanding: 0,
  });

  useEffect(() => {
    getQueueMetrics().then(setMetrics);
  }, []);

  return (
    <div className="flex items-center gap-4 text-xs flex-wrap">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Users className="size-3" />
        <span className="font-medium">{metrics.activeCount}</span>
        <span>active</span>
      </div>
      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3" />
        <span className="font-medium">{metrics.overdueCount}</span>
        <span>overdue</span>
      </div>
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle className="size-3" />
        <span className="font-medium">{metrics.promisedToday}</span>
        <span>promised today</span>
      </div>
      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
        <Phone className="size-3" />
        <span className="font-medium">{metrics.contactedToday}</span>
        <span>contacted today</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <IndianRupee className="size-3" />
        <span className="font-medium">
          ₹{metrics.totalOutstanding.toLocaleString("en-IN")}
        </span>
        <span>outstanding</span>
      </div>
    </div>
  );
}
