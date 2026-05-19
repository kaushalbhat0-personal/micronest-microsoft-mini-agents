"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Phone, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { updateFollowupStatus } from "@/features/followups/services/update-followup-status";
import { getAvailableTransitions } from "@/features/followups/services/state-machine";
import { getContactTimelineAction } from "@/features/timeline/services/get-contact-timeline-action";
import { ContactTimeline } from "@/features/timeline/components/contact-timeline";
import { scheduleFollowup } from "@/features/operations/services/schedule-followup";
import type { OperationalQueueItem, LifecycleStatus } from "@/features/followups/types";
import type { ContactEvent } from "@/features/timeline/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  opened: "WhatsApp Opened",
  contacted: "Contacted",
  responded: "Responded",
  promised: "Payment Promised",
  resolved: "Resolved",
  dismissed: "Dismissed",
  ignored: "Ignored",
};

interface OperationDetailPanelProps {
  item: OperationalQueueItem | null;
  onClose: () => void;
  onAction: () => void;
}

const SCHEDULE_OPTIONS = [
  { label: "Tomorrow", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString(); } },
  { label: "In 3 days", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString(); } },
  { label: "Next week", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString(); } },
];

export function OperationDetailPanel({ item, onClose, onAction }: OperationDetailPanelProps) {
  const [events, setEvents] = useState<ContactEvent[]>([]);
  const [isPending, startTransition] = useTransition();
  const contactId = item?.contact?.id;

  useEffect(() => {
    if (item && contactId) {
      getContactTimelineAction(contactId).then(setEvents);
    }
  }, [item, contactId]);

  if (!item) {
    return (
      <div className="hidden lg:flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a contact to view details</p>
      </div>
    );
  }

  const { candidate, contact } = item;
  const available = getAvailableTransitions(candidate.candidate_status as LifecycleStatus);

  async function handleStatusChange(newStatus: LifecycleStatus) {
    startTransition(async () => {
      await updateFollowupStatus(candidate.id, contact.id, newStatus);
      const updated = await getContactTimelineAction(contact.id);
      setEvents(updated);
      onAction();
    });
  }

  async function handleSchedule(dateStr: string) {
    startTransition(async () => {
      await scheduleFollowup(contact.id, dateStr);
      onAction();
    });
  }

  const dueAmount =
    contact.due_amount !== null
      ? `₹${Number(contact.due_amount).toLocaleString("en-IN")}`
      : null;

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="sticky top-0 bg-background z-10 flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Contact Details</h3>
        <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-full">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-base font-semibold">{contact.customer_name || "Unnamed"}</p>
          {contact.phone_number && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="size-3" />
              {contact.phone_number}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium border",
            candidate.priority === "high" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200",
            candidate.priority === "medium" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200",
            candidate.priority === "low" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200",
          )}>
            {candidate.priority.charAt(0).toUpperCase() + candidate.priority.slice(1)}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium border bg-muted text-muted-foreground">
            {STATUS_LABELS[candidate.candidate_status] ?? candidate.candidate_status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {dueAmount && (
            <div className="rounded-md border bg-card p-2">
              <span className="text-muted-foreground">Due Amount</span>
              <p className="font-semibold">{dueAmount}</p>
            </div>
          )}
          {contact.due_date && (
            <div className="rounded-md border bg-card p-2">
              <span className="text-muted-foreground">Due Date</span>
              <p className="font-semibold flex items-center gap-1">
                <Calendar className="size-3" />
                {contact.due_date}
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <AlertCircle className="size-3 shrink-0 mt-0.5" />
          {candidate.reason}
        </p>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                className="h-7 text-[10px]"
                disabled={isPending}
                onClick={() => handleStatusChange(status)}
              >
                {STATUS_LABELS[status] ?? status}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Schedule Follow-up</p>
          <div className="flex flex-wrap gap-1.5">
            {SCHEDULE_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                size="sm"
                variant="secondary"
                className="h-7 text-[10px]"
                disabled={isPending}
                onClick={() => handleSchedule(opt.getDate())}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Timeline</p>
          <ContactTimeline events={events} />
        </div>
      </div>
    </div>
  );
}
