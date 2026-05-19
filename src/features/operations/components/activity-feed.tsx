"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivityFeed } from "@/features/operations/services/get-activity-feed";
import type { ActivityEntry } from "@/features/operations/types";

function getRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getActivityFeed();
    setActivities(data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    getActivityFeed().then((data) => {
      if (!cancelled) {
        setActivities(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">Recent Activity</h4>
        <button type="button" onClick={load} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn("size-3", loading && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {activities.length === 0 && !loading && (
          <p className="text-[11px] text-muted-foreground text-center py-4">No recent activity</p>
        )}
        {activities.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 py-1">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] leading-tight">
                <span className="font-medium">{entry.contactName}</span>
                {" "}
                <span className="text-muted-foreground">{entry.description}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{getRelativeTime(entry.timestamp)}</p>
            </div>
          </div>
        ))}
        {loading && activities.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-4">Loading...</p>
        )}
      </div>
    </div>
  );
}
