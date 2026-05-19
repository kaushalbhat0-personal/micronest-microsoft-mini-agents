"use client";

import {
  Upload,
  MessageSquare,
  Phone,
  MessageCircle,
  IndianRupee,
  CheckCircle,
  XCircle,
  Slash,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactEvent } from "@/features/timeline/types";
import { EVENT_LABELS } from "@/features/timeline/types";

const ICON_MAP: Record<string, typeof Upload> = {
  upload: Upload,
  "message-square": MessageSquare,
  phone: Phone,
  "message-circle": MessageCircle,
  "indian-rupee": IndianRupee,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  slash: Slash,
  calendar: Calendar,
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface ContactTimelineProps {
  events: ContactEvent[];
}

export function ContactTimeline({ events }: ContactTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="size-8 text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const label = EVENT_LABELS[event.event_type as keyof typeof EVENT_LABELS] ?? event.event_type;
        const IconComponent = ICON_MAP[event.event_type] ?? Clock;
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-6 items-center justify-center rounded-full border bg-background">
                <IconComponent className="size-3 text-muted-foreground" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground">
                {getRelativeTime(event.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
