"use client";

import { Activity, X, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export interface ResumeSessionPayload {
  id: string;
  currentIndex: number;
  totalCount: number;
  counters: { sent: number; skipped: number; failed: number };
  currentContactName: string;
}

interface ResumeSessionModalProps {
  session: ResumeSessionPayload;
  onResume: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function ResumeSessionModal({
  session,
  onResume,
  onDiscard,
  onClose,
}: ResumeSessionModalProps) {
  const remaining = session.totalCount - session.currentIndex;
  const done =
    session.counters.sent + session.counters.skipped + session.counters.failed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Interrupted Session</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            A previous sequential send session was interrupted.
            You can resume where you left off or discard it.
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border bg-card p-2">
              <p className="font-semibold">{remaining}</p>
              <p className="text-muted-foreground">Remaining</p>
            </div>
            <div className="rounded-md border bg-card p-2">
              <p className="font-semibold">{done}</p>
              <p className="text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-md border bg-card p-2">
              <p className="font-semibold">{session.totalCount}</p>
              <p className="text-muted-foreground">Total</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Progress:</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(done / session.totalCount) * 100}%` }}
              />
            </div>
            <span>{Math.round((done / session.totalCount) * 100)}%</span>
          </div>

          {session.currentContactName && (
            <div className="text-xs text-muted-foreground">
              Last contact: <span className="font-medium text-foreground">{session.currentContactName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-green-600 dark:text-green-400">
              {session.counters.sent} sent
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {session.counters.skipped} skipped
            </span>
            <span className="text-red-600 dark:text-red-400">
              {session.counters.failed} failed
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onDiscard}
            className="h-8 text-xs"
          >
            <Trash2 className="size-3 mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={onResume}
            className="h-8 text-xs"
          >
            <RotateCcw className="size-3 mr-1" />
            Resume Session
          </Button>
        </div>
      </div>
    </div>
  );
}
