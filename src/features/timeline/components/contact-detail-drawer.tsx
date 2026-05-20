"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Phone, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { updateFollowupStatus } from "@/features/followups/services/update-followup-status";
import { getAvailableTransitions } from "@/features/followups/services/state-machine";
import { getContactTimelineAction } from "@/features/timeline/services/get-contact-timeline-action";
import { ContactTimeline } from "./contact-timeline";
import type { OperationalQueueItem, LifecycleStatus } from "@/features/followups/types";
import type { ContactEvent } from "@/features/timeline/types";
import { ErrorBoundary } from "@/shared/components/error-boundary";

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

interface ContactDetailDrawerProps {
  item: OperationalQueueItem;
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void;
}

export function ContactDetailDrawer({ item, isOpen, onClose, onAction }: ContactDetailDrawerProps) {
  const [events, setEvents] = useState<ContactEvent[]>([]);
  const [isPending, startTransition] = useTransition();
  const contactId = item?.contact?.id;

  useEffect(() => {
    if (isOpen && contactId) {
      getContactTimelineAction(contactId).then(setEvents);
    }
  }, [isOpen, contactId]);

  if (!item) return null;

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

  const dueAmount =
    contact.due_amount !== null
      ? `₹${Number(contact.due_amount).toLocaleString("en-IN")}`
      : null;

  if (!isOpen) return null;

  return (
    <ErrorBoundary name="ContactDetailDrawer">
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background border-l shadow-lg overflow-y-auto">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Contact Details</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
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
            <p className="text-xs font-medium text-muted-foreground">Timeline</p>
            <ContactTimeline events={events} />
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
