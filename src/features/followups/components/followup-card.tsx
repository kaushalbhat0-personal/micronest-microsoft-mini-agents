"use client";

import { useState, useTransition } from "react";
import { Phone, Calendar, AlertCircle, XCircle, Send, MessageSquare } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { updateFollowupStatus } from "@/features/followups/services/update-followup-status";
import { getAvailableTransitions } from "@/features/followups/services/state-machine";
import { buildFollowupMessage } from "@/features/messages/services/build-followup-message";
import { buildWhatsAppUrl } from "@/features/messages/services/build-whatsapp-url";
import { createFollowupAttempt } from "@/features/messages/services/create-followup-attempt";
import { MessagePreviewModal } from "@/features/messages/components/message-preview-modal";
import type { OperationalQueueItem, LifecycleStatus } from "@/features/followups/types";
import type { MessagePreviewData } from "@/features/messages/components/message-preview-modal";

const PRIORITY_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  high: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    label: "High",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-500",
    label: "Medium",
  },
  low: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    label: "Low",
  },
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  opened: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  responded: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  promised: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  opened: "Opened",
  contacted: "Contacted",
  responded: "Responded",
  promised: "Promised",
};

const TRANSITION_LABELS: Record<string, string> = {
  opened: "Mark Opened",
  contacted: "Mark Contacted",
  responded: "Customer Responded",
  promised: "Payment Promised",
  resolved: "Mark Resolved",
  dismissed: "Dismiss",
  ignored: "Ignore",
};

const TRANSITION_VARIANTS: Record<string, "default" | "secondary" | "outline" | "ghost" | "destructive"> = {
  opened: "secondary",
  contacted: "secondary",
  responded: "default",
  promised: "default",
  resolved: "default",
  dismissed: "ghost",
  ignored: "ghost",
};

interface FollowupCardProps {
  item: OperationalQueueItem;
  onAction: () => void;
  onOpenDetail: () => void;
}

export function FollowupCard({ item, onAction, onOpenDetail }: FollowupCardProps) {
  const [isTransitioning, startTransition] = useTransition();
  const [isOpening, startOpening] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const { candidate, contact } = item;
  const style = PRIORITY_STYLES[candidate.priority] ?? PRIORITY_STYLES.medium;
  const currentStatus = candidate.candidate_status as LifecycleStatus;
  const available = getAvailableTransitions(currentStatus);

  const dueAmount =
    contact.due_amount !== null
      ? `₹${Number(contact.due_amount).toLocaleString("en-IN")}`
      : null;

  const generatedMessage = buildFollowupMessage(contact);
  const finalMessage = editedMessage ?? generatedMessage;
  const whatsappUrl = buildWhatsAppUrl(contact.phone_number, finalMessage);
  const lastAttempt = item.lastAttempt;

  const previewData: MessagePreviewData = {
    message: finalMessage,
    phoneNumber: contact.phone_number,
    customerName: contact.customer_name,
  };

  async function handleStatusChange(newStatus: LifecycleStatus) {
    startTransition(async () => {
      await updateFollowupStatus(candidate.id, contact.id, newStatus);
      onAction();
    });
  }

  async function handleSendWhatsApp() {
    setShowPreview(true);
  }

  async function handleConfirmWhatsApp() {
    if (!whatsappUrl) return;

    startOpening(async () => {
      await createFollowupAttempt(candidate.id, contact.id, finalMessage);
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setShowPreview(false);
      onAction();
    });
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpenDetail}
            className="flex items-center gap-2 min-w-0 text-left flex-1"
          >
            <span className={cn("size-2 shrink-0 rounded-full mt-0.5", style.dot)} />
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium border", style.badge)}>
              {style.label}
            </span>
            {dueAmount && (
              <span className="text-sm font-semibold whitespace-nowrap">{dueAmount}</span>
            )}
            {currentStatus !== "pending" && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_BADGE[currentStatus])}>
                {STATUS_LABEL[currentStatus] ?? currentStatus}
              </span>
            )}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            {lastAttempt && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                lastAttempt.attempt_status === "opened" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                lastAttempt.attempt_status === "sent" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                lastAttempt.attempt_status === "failed" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
              )}>
                {lastAttempt.attempt_status === "opened" && "WhatsApp Opened"}
                {lastAttempt.attempt_status === "sent" && "Sent"}
                {lastAttempt.attempt_status === "failed" && "Failed"}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenDetail}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{contact.customer_name || "Unnamed"}</p>
              {contact.phone_number && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="size-3" />
                  {contact.phone_number}
                </p>
              )}
            </div>
            {contact.due_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <Calendar className="size-3" />
                {contact.due_date}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
            <AlertCircle className="size-3 shrink-0 mt-0.5" />
            {candidate.reason}
          </p>
        </button>

        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            disabled={!contact.phone_number || isOpening}
            onClick={handleSendWhatsApp}
          >
            {lastAttempt ? (
              <MessageSquare className="size-3 mr-1" />
            ) : (
              <Send className="size-3 mr-1" />
            )}
            Send WhatsApp
          </Button>
          {available.filter((s) => s !== "dismissed" && s !== "ignored").map((status) => (
            <Button
              key={status}
              size="sm"
              variant={TRANSITION_VARIANTS[status] ?? "outline"}
              className="h-7 text-[10px]"
              disabled={isTransitioning}
              onClick={() => handleStatusChange(status)}
            >
              {isTransitioning ? (
                <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : null}
              {TRANSITION_LABELS[status] ?? status}
            </Button>
          ))}
          {available.includes("dismissed") && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-muted-foreground"
              disabled={isTransitioning}
              onClick={() => handleStatusChange("dismissed")}
            >
              <XCircle className="size-3 mr-1" />
              Dismiss
            </Button>
          )}
        </div>
      </div>

      {showPreview && (
        <MessagePreviewModal
          data={previewData}
          whatsappUrl={whatsappUrl}
          isOpening={isOpening}
          onEditMessage={setEditedMessage}
          onConfirm={handleConfirmWhatsApp}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
