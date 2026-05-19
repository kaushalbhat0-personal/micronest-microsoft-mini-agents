"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

export interface MessagePreviewData {
  message: string;
  phoneNumber: string;
  customerName: string;
}

interface MessagePreviewModalProps {
  data: MessagePreviewData;
  whatsappUrl: string | null;
  isOpening: boolean;
  onEditMessage: (message: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MessagePreviewModal({
  data,
  whatsappUrl,
  isOpening,
  onEditMessage,
  onConfirm,
  onCancel,
}: MessagePreviewModalProps) {
  const [editedMessage, setEditedMessage] = useState(data.message);

  function handleChange(value: string) {
    setEditedMessage(value);
    onEditMessage(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Send WhatsApp</h3>
            <p className="text-xs text-muted-foreground">to {data.customerName || data.phoneNumber}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isOpening}
            className="p-1 hover:bg-muted rounded-full"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium">Recipient:</span> {data.phoneNumber}
          </div>

          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <textarea
            value={editedMessage}
            onChange={(e) => handleChange(e.target.value)}
            rows={5}
            disabled={isOpening}
            className={cn(
              "w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "disabled:opacity-50"
            )}
          />

          <div className="rounded-md bg-green-50 dark:bg-green-950/20 px-3 py-2 text-xs text-green-700 dark:text-green-300">
            <span className="font-medium">WhatsApp Web</span> will open in a new tab.
            Review and send the message manually.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isOpening}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={!whatsappUrl || isOpening}
            className="h-8 text-xs"
          >
            {isOpening ? (
              <>
                <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                Opening...
              </>
            ) : (
              <>
                <ExternalLink className="size-3 mr-1" />
                Open WhatsApp
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
