"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

export interface FailedAction {
  index: number;
  category: string;
  message: string;
  retryable: boolean;
  candidateId?: string;
  contactId?: string;
}

interface FailedActionsQueueProps {
  failures: FailedAction[];
  onRetry: (index: number) => void;
  onDismiss: (index: number) => void;
  onRetryAll: () => void;
  onDismissAll: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  INVALID_NUMBER: "Invalid Number",
  WHATSAPP_DISCONNECTED: "WhatsApp Disconnected",
  DOM_NOT_FOUND: "DOM Not Found",
  SEND_TIMEOUT: "Send Timeout",
  TAB_CLOSED: "Tab Closed",
  MESSAGE_INJECTION_FAILED: "Injection Failed",
  RATE_LIMITED: "Rate Limited",
  UNKNOWN: "Unknown Error",
};

const CATEGORY_COLORS: Record<string, string> = {
  INVALID_NUMBER: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  WHATSAPP_DISCONNECTED: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  DOM_NOT_FOUND: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  SEND_TIMEOUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  RATE_LIMITED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function FailedActionsQueue({
  failures,
  onRetry,
  onDismiss,
  onRetryAll,
  onDismissAll,
}: FailedActionsQueueProps) {
  const [expanded, setExpanded] = useState(false);

  if (failures.length === 0) return null;

  const retryableCount = failures.filter((f) => f.retryable).length;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5" />
          <span>{failures.length} Failed Sends</span>
          {retryableCount > 0 && (
            <span className="text-muted-foreground font-normal">
              ({retryableCount} retryable)
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {expanded && (
        <div className="border-t px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
          {failures.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No failures</p>
          )}
          {failures.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5"
            >
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-[10px] px-1 py-0.5 rounded font-medium inline-block mr-1.5",
                    CATEGORY_COLORS[f.category] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {CATEGORY_LABELS[f.category] ?? f.category}
                </span>
                <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                  {f.message}
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {f.retryable && (
                  <button
                    type="button"
                    onClick={() => onRetry(f.index)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Retry"
                  >
                    <RefreshCw className="size-3 text-muted-foreground" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDismiss(f.index)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Dismiss"
                >
                  <X className="size-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}

          {failures.length > 1 && (
            <div className="flex items-center gap-1.5 pt-1">
              {retryableCount > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 text-[10px]"
                  onClick={onRetryAll}
                >
                  <RefreshCw className="size-2.5 mr-1" />
                  Retry All ({retryableCount})
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] text-muted-foreground"
                onClick={onDismissAll}
              >
                <X className="size-2.5 mr-1" />
                Dismiss All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
