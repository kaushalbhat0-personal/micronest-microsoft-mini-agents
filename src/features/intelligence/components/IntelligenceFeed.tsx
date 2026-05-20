"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { IntelligenceFeedItem } from "@/features/intelligence/types";

interface IntelligenceFeedProps {
  items: IntelligenceFeedItem[];
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function IntelligenceFeed({ items }: IntelligenceFeedProps) {
  const sorted = useMemo(() => [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [items]);
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Intelligence Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {sorted.slice(0, 20).map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-xs">
            <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${severityColors[item.severity] ?? severityColors.info}`}>
              {item.severity}
            </span>
            <span className="text-muted-foreground">{item.message}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
