"use client";

import { SendHorizonal, X, Users, MessageSquare } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { OperationalQueueItem } from "@/features/followups/types";

interface SessionPreviewModalProps {
  items: OperationalQueueItem[];
  sessionId: string | null;
  isCreating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SessionPreviewModal({
  items,
  sessionId,
  isCreating,
  onConfirm,
  onCancel,
}: SessionPreviewModalProps) {
  const totalDue = items.reduce(
    (sum, i) => sum + (i.contact.due_amount ?? 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <SendHorizonal className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Sequential Send</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="p-1 hover:bg-muted rounded-full"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Review your session</span>
            <br />
            Messages will be sent sequentially with 8–15 second randomized delays.
            You can pause, skip, or stop at any time.
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border bg-card p-2">
              <Users className="size-4 mx-auto mb-1 text-muted-foreground" />
              <p className="font-semibold">{items.length}</p>
              <p className="text-muted-foreground">Contacts</p>
            </div>
            <div className="rounded-md border bg-card p-2">
              <MessageSquare className="size-4 mx-auto mb-1 text-muted-foreground" />
              <p className="font-semibold">{items.length}</p>
              <p className="text-muted-foreground">Messages</p>
            </div>
            <div className="rounded-md border bg-card p-2">
              <Users className="size-4 mx-auto mb-1 text-muted-foreground" />
              <p className="font-semibold">₹{totalDue.toLocaleString("en-IN")}</p>
              <p className="text-muted-foreground">Total Due</p>
            </div>
          </div>

          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {items.map((item) => (
              <div
                key={item.candidate.id}
                className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium truncate flex-1">
                  {item.contact.customer_name || "Unnamed"}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {item.contact.phone_number}
                </span>
              </div>
            ))}
          </div>

          {sessionId && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 px-3 py-2 text-xs text-green-700 dark:text-green-300">
              Session created. Make sure WhatsApp Web is open in your browser before starting.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isCreating}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isCreating || items.length === 0}
            className="h-8 text-xs"
          >
            {isCreating ? (
              <>
                <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                Preparing...
              </>
            ) : (
              <>
                <SendHorizonal className="size-3 mr-1" />
                Start Sequential Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
