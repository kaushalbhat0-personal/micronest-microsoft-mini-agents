"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Pause, Play, SkipForward, Square, MessageSquare } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SequentialSessionState, SessionContact } from "@/features/messages/types/sequential-session";

export interface SendControllerSession {
  id: string;
  state: SequentialSessionState;
  contacts: SessionContact[];
  currentIndex: number;
  delayRemainingMs: number;
  currentContactName: string;
  counters: {
    sent: number;
    skipped: number;
    failed: number;
    retries?: number;
  };
  failedCount?: number;
}

interface SendControllerProps {
  session: SendControllerSession;
  onClose: () => void;
  onEditMessage: (sessionId: string, index: number, message: string) => void;
}

function postToExtension(type: string, payload: Record<string, unknown>): void {
  window.postMessage(
    {
      type: "MICRONEST_SEQUENCE",
      payload: { type, payload },
    },
    "*"
  );
}

export function SendController({ session: propSession, onClose: _onClose, onEditMessage }: SendControllerProps) {
  const [localSession, setLocalSession] = useState(propSession);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "MICRONEST_SEQUENCE_RESPONSE") {
        const resp = event.data.payload;
        if (resp.messageType === "START_SEQUENCE" && !resp.success) {
          toast.error(resp.error ?? "Failed to start sequence");
        }
      }

      if (event.data?.type === "MICRONEST_SEQUENCE_STATUS") {
        setLocalSession((prev) => ({
          ...prev,
          state: event.data.state as SequentialSessionState,
          currentIndex: event.data.currentIndex as number,
          delayRemainingMs: event.data.delayRemainingMs as number,
          currentContactName: event.data.currentContactName as string,
          counters: event.data.counters as { sent: number; skipped: number; failed: number },
        }));

        if (event.data.state === "completed") {
          toast.success("Sequential send completed!");
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (editingIndex !== null && editRef.current) {
      editRef.current.focus();
    }
  }, [editingIndex]);

  const currentContact = localSession.contacts[localSession.currentIndex];

  const handlePause = useCallback(() => postToExtension("PAUSE_SEQUENCE", { sessionId: localSession.id }), [localSession.id]);
  const handleResume = useCallback(() => postToExtension("RESUME_SEQUENCE", { sessionId: localSession.id }), [localSession.id]);
  const handleStop = useCallback(() => postToExtension("STOP_SEQUENCE", { sessionId: localSession.id }), [localSession.id]);
  const handleSkip = useCallback(() => postToExtension("SKIP_CURRENT", { sessionId: localSession.id }), [localSession.id]);

  const handleStartEdit = useCallback((index: number, msg: string) => {
    setEditingIndex(index);
    setEditMessage(msg);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingIndex !== null && editMessage) {
      onEditMessage(localSession.id, editingIndex, editMessage);
      postToExtension("EDIT_MESSAGE", {
        sessionId: localSession.id,
        index: editingIndex,
        msg: editMessage,
      });
      setEditingIndex(null);
      setEditMessage("");
    }
  }, [editingIndex, editMessage, localSession.id, onEditMessage]);

  const total = localSession.contacts.length;
  const doneCount = localSession.counters.sent + localSession.counters.skipped + localSession.counters.failed;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isRunning = localSession.state === "sending";
  const isPaused = localSession.state === "paused";
  const isDone = localSession.state === "completed" || localSession.state === "stopped";

  if (isDone) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[480px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-lg border bg-card shadow-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            <span className="text-sm font-semibold">
              Sequential Send
            </span>
            <span className="text-xs text-muted-foreground">
              {doneCount} / {total}
            </span>
          </div>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium",
            isRunning && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
            isPaused && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
          )}>
            {isRunning && `Next in ${Math.round(localSession.delayRemainingMs / 1000)}s`}
            {isPaused && "Paused"}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="text-green-600 dark:text-green-400">
              <span className="font-semibold">{localSession.counters.sent}</span> sent
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              <span className="font-semibold">{localSession.counters.skipped}</span> skipped
            </span>
            <span className="text-red-600 dark:text-red-400">
              <span className="font-semibold">{localSession.counters.failed}</span> failed
            </span>
          </div>
          {currentContact && (
            <span className="text-muted-foreground truncate max-w-[160px]">
              {currentContact.customerName || currentContact.phoneNumber}
            </span>
          )}
        </div>

        {editingIndex === localSession.currentIndex && currentContact && (
          <div className="space-y-1.5 pt-1 border-t">
            <p className="text-[11px] font-medium text-muted-foreground">
              Edit message for {currentContact.customerName || currentContact.phoneNumber}
            </p>
            <textarea
              ref={editRef}
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingIndex(null)}>
                Cancel
              </Button>
              <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveEdit}>
                Save & Continue
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-0.5">
          {isPaused && (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleResume}>
              <Play className="size-3 mr-1" />
              Resume
            </Button>
          )}
          {isRunning && (
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handlePause}>
              <Pause className="size-3 mr-1" />
              Pause
            </Button>
          )}
          {!isDone && (
            <>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSkip}>
                <SkipForward className="size-3 mr-1" />
                Skip
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleStop}>
                <Square className="size-3 mr-1" />
                Stop
              </Button>
            </>
          )}
          {currentContact && editingIndex !== localSession.currentIndex && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground ml-auto"
              onClick={() => handleStartEdit(localSession.currentIndex, currentContact.message)}
            >
              Edit Message
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
