"use client";

import { useState, useTransition } from "react";
import { Send, SendHorizonal, CheckCircle, IndianRupee, XCircle, Calendar } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { bulkUpdateStatus } from "@/features/operations/services/bulk-update-status";
import { bulkScheduleFollowup } from "@/features/operations/services/bulk-schedule-followup";
import { buildWhatsAppUrl } from "@/features/messages/services/build-whatsapp-url";
import type { OperationalQueueItem, LifecycleStatus } from "@/features/followups/types";

interface RapidActionBarProps {
  selectedItems: OperationalQueueItem[];
  onClearSelection: () => void;
  onActionComplete: () => void;
  onStartSequential?: () => void;
}

const SCHEDULE_OPTIONS = [
  { label: "Tomorrow", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString(); } },
  { label: "In 3 days", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString(); } },
  { label: "Next week", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString(); } },
];

export function RapidActionBar({ selectedItems, onClearSelection, onActionComplete, onStartSequential }: RapidActionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [showSchedule, setShowSchedule] = useState(false);

  const updates = selectedItems.map((i) => ({
    candidateId: i.candidate.id,
    contactId: i.contact.id,
  }));

  async function handleBulkStatus(newStatus: LifecycleStatus) {
    startTransition(async () => {
      const result = await bulkUpdateStatus(updates, newStatus);
      if (result.success) {
        toast.success(`${result.count} contact(s) updated`);
        onClearSelection();
        onActionComplete();
      } else {
        toast.error(result.error ?? "Failed to update");
      }
    });
  }

  async function handleBulkSchedule(dateStr: string) {
    startTransition(async () => {
      const result = await bulkScheduleFollowup(updates, dateStr);
      if (result.success) {
        toast.success(`${result.count} follow-up(s) scheduled`);
        setShowSchedule(false);
        onClearSelection();
        onActionComplete();
      } else {
        toast.error(result.error ?? "Failed to schedule");
      }
    });
  }

  if (selectedItems.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-lg">
      <span className="text-xs font-medium text-muted-foreground mr-1">
        {selectedItems.length} selected
      </span>

      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={onStartSequential}
      >
        <SendHorizonal className="size-3 mr-1" />
        Sequential
      </Button>

      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => {
          const item = selectedItems[0];
          if (item?.contact.phone_number) {
            const msg = "Hello, this is a follow-up from MicroNest.";
            const url = buildWhatsAppUrl(item.contact.phone_number, msg);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          }
        }}
      >
        <Send className="size-3 mr-1" />
        WhatsApp
      </Button>

      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => handleBulkStatus("responded")}
      >
        <CheckCircle className="size-3 mr-1" />
        Responded
      </Button>

      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => handleBulkStatus("promised")}
      >
        <IndianRupee className="size-3 mr-1" />
        Promised
      </Button>

      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => handleBulkStatus("resolved")}
      >
        <CheckCircle className="size-3 mr-1" />
        Resolve
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground"
        disabled={isPending}
        onClick={() => handleBulkStatus("dismissed")}
      >
        <XCircle className="size-3 mr-1" />
        Dismiss
      </Button>

      <div className="relative">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          disabled={isPending}
          onClick={() => setShowSchedule(!showSchedule)}
        >
          <Calendar className="size-3 mr-1" />
          Schedule
        </Button>

        {showSchedule && (
          <div className="absolute bottom-full left-0 mb-2 rounded-md border bg-card p-1 shadow-lg space-y-0.5 min-w-[120px]">
            {SCHEDULE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleBulkSchedule(opt.getDate())}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
