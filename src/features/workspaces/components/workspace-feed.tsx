"use client";

import { useState, useEffect } from "react";
import { getWorkspaceFeed } from "@/features/workspaces/services/workspace-activity";
import type { WorkspaceActivity } from "@/features/workspaces/types";

interface WorkspaceFeedProps {
  workspaceId: string;
}

const activityLabels: Record<string, string> = {
  assignment: "Assigned contacts",
  resolve: "Resolved contacts",
  session: "Started sequential session",
  update: "Updated follow-up status",
  note: "Added notes",
};

const activityColors: Record<string, string> = {
  assignment: "text-blue-600 dark:text-blue-400",
  resolve: "text-green-600 dark:text-green-400",
  session: "text-purple-600 dark:text-purple-400",
  update: "text-amber-600 dark:text-amber-400",
  note: "text-sky-600 dark:text-sky-400",
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function WorkspaceFeed({ workspaceId }: WorkspaceFeedProps) {
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);

  useEffect(() => {
    getWorkspaceFeed(workspaceId, 50).then(setActivities);
  }, [workspaceId]);

  return (
    <div className="space-y-1">
      {activities.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No recent activity.
        </p>
      )}
      {activities.map((activity) => {
        const label = activityLabels[activity.activity_type] ?? activity.activity_type;
        const color = activityColors[activity.activity_type] ?? "text-muted-foreground";
        return (
          <div
            key={activity.id}
            className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">
                {activity.actor_name?.split("@")[0] ?? "Unknown"}
              </span>
              <span className={color}>{label}</span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
