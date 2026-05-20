"use client";

import { memo } from "react";
import { Phone, Calendar, AlertCircle, MessageSquare } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { OperationalQueueItem } from "@/features/followups/types";
import type { RiskLevel } from "@/features/intelligence/types";
import { RiskBadge } from "@/features/intelligence/components/RiskBadge";
import { EscalationBadge } from "@/features/intelligence/components/EscalationBadge";
import { SlaStatus } from "@/features/intelligence/components/SlaStatus";

const PRIORITY_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-red-500", label: "High" },
  medium: { dot: "bg-yellow-500", label: "Medium" },
  low: { dot: "bg-blue-500", label: "Low" },
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

interface OperationCardProps {
  item: OperationalQueueItem;
  isSelected: boolean;
  isHighlighted: boolean;
  onToggleSelect: (candidateId: string) => void;
  onClick: () => void;
  onDoubleClick: () => void;
}

export const OperationCard = memo(function OperationCard({
  item,
  isSelected,
  isHighlighted,
  onToggleSelect,
  onClick,
  onDoubleClick,
}: OperationCardProps) {
  const { candidate, contact } = item;
  const style = PRIORITY_STYLES[candidate.priority] ?? PRIORITY_STYLES.medium;
  const dueAmount =
    contact.due_amount !== null
      ? `₹${Number(contact.due_amount).toLocaleString("en-IN")}`
      : null;
  const lastAttemptStatus = item.lastAttempt?.attempt_status;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer",
        isHighlighted && "border-primary bg-accent/50 ring-1 ring-primary/20",
        isSelected && !isHighlighted && "border-primary/40 bg-accent/30",
        !isHighlighted && !isSelected && "bg-card hover:bg-accent/50"
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(candidate.id)}
        onClick={(e) => e.stopPropagation()}
        className="mt-1"
      />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
          <span className="text-sm font-medium truncate">
            {contact.customer_name || "Unnamed"}
          </span>
          {dueAmount && (
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              {dueAmount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {contact.phone_number && (
            <span className="flex items-center gap-0.5">
              <Phone className="size-3" />
              {contact.phone_number}
            </span>
          )}
          {contact.due_date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="size-3" />
              {contact.due_date}
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground flex items-start gap-1 line-clamp-1">
          <AlertCircle className="size-3 shrink-0 mt-0.5" />
          {candidate.reason}
        </p>

        <div className="flex items-center gap-1.5">
          {candidate.candidate_status !== "pending" && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_BADGE[candidate.candidate_status])}>
              {STATUS_LABEL[candidate.candidate_status] ?? candidate.candidate_status}
            </span>
          )}
          {lastAttemptStatus && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              lastAttemptStatus === "opened" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
              lastAttemptStatus === "sent" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
              lastAttemptStatus === "failed" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
            )}>
              <MessageSquare className="size-2.5 inline mr-0.5" />
              {lastAttemptStatus === "opened" ? "Opened" : lastAttemptStatus === "sent" ? "Sent" : "Failed"}
            </span>
          )}
          {contact.next_followup_at && (
            <span className="text-[10px] text-muted-foreground">
              Follow-up: {new Date(contact.next_followup_at).toLocaleDateString("en-IN")}
            </span>
          )}
          <RiskBadge level={(contact.risk_level ?? "low") as RiskLevel} />
          <EscalationBadge level={contact.escalation_level ?? 0} />
          <SlaStatus slaDueAt={contact.sla_due_at ?? undefined} />
        </div>
      </div>
    </div>
  );
});
