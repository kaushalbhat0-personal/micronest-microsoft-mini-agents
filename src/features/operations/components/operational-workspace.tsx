"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { OperationMetricsBar } from "./operation-metrics-bar";
import { QueueFilters } from "./queue-filters";
import { OperationCard } from "./operation-card";
import { OperationDetailPanel } from "./operation-detail-panel";
import { RapidActionBar } from "./rapid-action-bar";
import { ActivityFeed } from "./activity-feed";
import { SendController } from "./send-controller";
import { SessionPreviewModal } from "./session-preview-modal";
import { ResumeSessionModal } from "./resume-session-modal";
import { FailedActionsQueue } from "./failed-actions-queue";
import { useKeyboardNav } from "@/features/operations/hooks/use-keyboard-nav";
import { useBulkSelection } from "@/features/operations/hooks/use-bulk-selection";
import { useQueueFiltering } from "@/features/operations/hooks/use-queue-filtering";
import { prioritizeQueue } from "@/features/operations/services/prioritize-queue";
import { updateFollowupStatus } from "@/features/followups/services/update-followup-status";
import { buildFollowupMessage } from "@/features/messages/services/build-followup-message";
import { buildWhatsAppUrl } from "@/features/messages/services/build-whatsapp-url";
import { createFollowupAttempt } from "@/features/messages/services/create-followup-attempt";
import { createSequentialSession } from "@/features/messages/services/create-sequential-session";
import { MessagePreviewModal } from "@/features/messages/components/message-preview-modal";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import type { OperationalQueueItem, LifecycleStatus } from "@/features/followups/types";
import type { MessagePreviewData } from "@/features/messages/components/message-preview-modal";
import type { SendControllerSession } from "./send-controller";
import type { ResumeSessionPayload } from "./resume-session-modal";
import type { FailedAction } from "./failed-actions-queue";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { OperatorAssist } from "@/features/intelligence/components/OperatorAssist";
import type { Recommendation, IntelligenceFeedItem } from "@/features/intelligence/types";

interface OperationalWorkspaceProps {
  initialQueue: OperationalQueueItem[];
  recommendation?: Recommendation | null;
  prioritizedItems?: OperationalQueueItem[];
  intelligenceFeed?: IntelligenceFeedItem[];
}

export function OperationalWorkspace({ initialQueue, recommendation, prioritizedItems, intelligenceFeed }: OperationalWorkspaceProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const sortedQueue = useMemo(() => {
    if (prioritizedItems) return prioritizedItems;
    return prioritizeQueue(initialQueue);
  }, [initialQueue, prioritizedItems]);
  const { filters, updateFilter, resetFilters, hasActiveFilters, filteredItems } = useQueueFiltering(sortedQueue);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailItem, setDetailItem] = useState<OperationalQueueItem | null>(null);
  const [whatsappItem, setWhatsappItem] = useState<OperationalQueueItem | null>(null);
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const [isOpening, startOpening] = useState(false);

  const [showSessionPreview, setShowSessionPreview] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeSendSession, setActiveSendSession] = useState<SendControllerSession | null>(null);
  const [recoverySession, setRecoverySession] = useState<ResumeSessionPayload | null>(null);
  const [failedActions, setFailedActions] = useState<FailedAction[]>([]);

  const {
    selectedIds,
    selectedItems,
    toggleSelection,
    clearSelection,
    selectAcrossItems,
    isSelected,
  } = useBulkSelection(filteredItems);

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 5,
  });

  const handleSelectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
    setDetailItem(filteredItems[index] ?? null);
  }, [filteredItems]);

  const handleOpenWhatsApp = useCallback((item: OperationalQueueItem) => {
    setWhatsappItem(item);
  }, []);

  const handleStatusChange = useCallback(async (item: OperationalQueueItem, status: LifecycleStatus) => {
    await updateFollowupStatus(item.candidate.id, item.contact.id, status);
    router.refresh();
  }, [router]);

  const handleDismiss = useCallback((item: OperationalQueueItem) => {
    handleStatusChange(item, "dismissed");
  }, [handleStatusChange]);

  const handleClose = useCallback(() => {
    setDetailItem(null);
    setWhatsappItem(null);
  }, []);

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleAction = useCallback(() => {
    router.refresh();
  }, [router]);

  useKeyboardNav({
    items: filteredItems,
    selectedIndex,
    onSelectIndex: handleSelectIndex,
    onOpenWhatsApp: handleOpenWhatsApp,
    onStatusChange: handleStatusChange,
    onDismiss: handleDismiss,
    onClose: handleClose,
    onFocusSearch: handleFocusSearch,
  });

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "MICRONEST_SEQUENCE_RESPONSE") {
        const resp = event.data.payload;
        if (resp.messageType === "GET_RECOVERY_STATUS" && resp.hasRecoveredSession && resp.session) {
          setRecoverySession({
            id: resp.session.id,
            currentIndex: resp.session.currentIndex,
            totalCount: resp.session.totalCount,
            counters: resp.session.counters,
            currentContactName: resp.session.currentContactName,
          });
        }
      }
    }

    window.addEventListener("message", handleMessage);

    window.postMessage(
      {
        type: "MICRONEST_SEQUENCE",
        payload: { type: "GET_RECOVERY_STATUS", payload: {} },
      },
      "*"
    );

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleStartSequential() {
    if (selectedItems.length === 0) return;
    setShowSessionPreview(true);
    setIsCreatingSession(true);

    try {
      const result = await createSequentialSession({
        items: selectedItems.map((i) => ({
          candidateId: i.candidate.id,
          contactId: i.contact.id,
          phoneNumber: i.contact.phone_number,
          customerName: i.contact.customer_name || "Unnamed",
        })),
      });

      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
      } else {
        toast.error(result.error ?? "Failed to create session");
        setShowSessionPreview(false);
      }
    } catch {
      toast.error("Failed to create session");
      setShowSessionPreview(false);
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleConfirmSession() {
    if (!sessionId) return;

    const contacts = selectedItems.map((i) => ({
      candidateId: i.candidate.id,
      contactId: i.contact.id,
      phoneNumber: i.contact.phone_number,
      customerName: i.contact.customer_name || "Unnamed",
      message: buildFollowupMessage(i.contact),
    }));

    const session: SendControllerSession = {
      id: sessionId,
      state: "sending",
      contacts: contacts.map((c) => ({
        candidateId: c.candidateId,
        contactId: c.contactId,
        phoneNumber: c.phoneNumber,
        customerName: c.customerName,
        message: c.message,
        state: "queued",
      })),
      currentIndex: 0,
      delayRemainingMs: 0,
      currentContactName: contacts[0]?.customerName ?? "",
      counters: { sent: 0, skipped: 0, failed: 0 },
    };

    setActiveSendSession(session);
    setShowSessionPreview(false);
    clearSelection();

    window.postMessage(
      {
        type: "MICRONEST_SEQUENCE",
        payload: {
          type: "START_SEQUENCE",
          payload: {
            sessionId,
            contacts: contacts.map((c) => ({
              candidateId: c.candidateId,
              contactId: c.contactId,
              phoneNumber: c.phoneNumber.replace(/\D/g, ""),
              customerName: c.customerName,
              message: c.message,
            })),
          },
        },
      },
      "*"
    );
  }

  function handleEditMessage(sessionId_: string, index: number, message: string) {
    setActiveSendSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.contacts = [...updated.contacts];
      updated.contacts[index] = { ...updated.contacts[index], message };
      return updated;
    });

    window.postMessage(
      {
        type: "MICRONEST_SEQUENCE",
        payload: {
          type: "EDIT_MESSAGE",
          payload: { sessionId: sessionId_, index, msg: message },
        },
      },
      "*"
    );
  }

  function handleResumeSession() {
    if (!recoverySession) return;
    window.postMessage(
      {
        type: "MICRONEST_SEQUENCE",
        payload: { type: "RESUME_SEQUENCE", payload: { sessionId: recoverySession.id } },
      },
      "*"
    );
    setRecoverySession(null);
    setActiveSendSession((prev) =>
      prev ? { ...prev, state: "sending" } : prev
    );
  }

  function handleDiscardSession() {
    if (!recoverySession) return;
    window.postMessage(
      {
        type: "MICRONEST_SEQUENCE",
        payload: { type: "DISCARD_RECOVERED_SESSION", payload: { sessionId: recoverySession.id } },
      },
      "*"
    );
    setRecoverySession(null);
  }

  function handleRetryFailedAction(index: number) {
    window.postMessage(
      {
        type: "MICRONEST_SEQUENCE",
        payload: { type: "RESUME_SEQUENCE", payload: { sessionId: activeSendSession?.id } },
      },
      "*"
    );
    setFailedActions((prev) => prev.filter((_, i) => i !== index));
  }

  const whatsappPreview = whatsappItem
    ? (() => {
        const msg = buildFollowupMessage(whatsappItem.contact);
        const finalMsg = editedMessage ?? msg;
        const url = buildWhatsAppUrl(whatsappItem.contact.phone_number, finalMsg);
        const previewData: MessagePreviewData = {
          message: finalMsg,
          phoneNumber: whatsappItem.contact.phone_number,
          customerName: whatsappItem.contact.customer_name,
        };
        return { previewData, url, finalMsg };
      })()
    : null;

  async function handleConfirmWhatsApp() {
    if (!whatsappItem || !whatsappPreview?.url) return;
    const msg = whatsappPreview.finalMsg;
    startOpening(true);
    await createFollowupAttempt(whatsappItem.candidate.id, whatsappItem.contact.id, msg);
    window.open(whatsappPreview.url, "_blank", "noopener,noreferrer");
    setWhatsappItem(null);
    setEditedMessage(null);
    startOpening(false);
    router.refresh();
  }

  const totalCount = sortedQueue.length;
  const displayedCount = filteredItems.length;

  if (totalCount === 0) {
    return (
      <ErrorBoundary name="OperationalWorkspace">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No pending follow-ups</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a spreadsheet and confirm the import to generate follow-up candidates.
          </p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="OperationalWorkspace">
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="shrink-0 space-y-2 border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Operations</h1>
          <OperationMetricsBar />
        </div>
        {recommendation && (
          <div className="max-w-md">
            <OperatorAssist recommendation={recommendation} />
          </div>
        )}
        <QueueFilters
          filters={filters}
          onUpdateFilter={updateFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          inputRef={searchInputRef as React.RefObject<HTMLInputElement | null>}
          totalCount={totalCount}
          filteredCount={displayedCount}
        />
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {displayedCount > 0 && (
            <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-b">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredItems.length;
                      }
                    }}
                    checked={selectedIds.size > 0 && selectedIds.size === filteredItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAcrossItems(filteredItems);
                      } else {
                        clearSelection();
                      }
                    }}
                    className="size-3.5"
                  />
                  Select all
                </label>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {detailItem && (
                  <button
                    type="button"
                    onClick={() => setDetailItem(null)}
                    className="hover:text-foreground transition-colors"
                  >
                    Close detail
                  </button>
                )}
                <span>J/K navigate · Enter WhatsApp · R respond · P promise · X dismiss · E resolve</span>
              </div>
            </div>
          )}

          <div ref={parentRef} className="flex-1 overflow-y-auto px-3 py-2">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = filteredItems[virtualItem.index];
                if (!item) return null;
                return (
                  <div
                    key={item.candidate.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    ref={virtualizer.measureElement}
                    data-index={virtualItem.index}
                  >
                    <OperationCard
                      item={item}
                      isSelected={isSelected(item.candidate.id)}
                      isHighlighted={virtualItem.index === selectedIndex}
                      onToggleSelect={toggleSelection}
                      onClick={() => {
                        setSelectedIndex(virtualItem.index);
                        setDetailItem(item);
                      }}
                      onDoubleClick={() => {
                        setSelectedIndex(virtualItem.index);
                        setWhatsappItem(item);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-96 xl:w-[420px] shrink-0 flex-col">
          {detailItem ? (
            <OperationDetailPanel
              item={detailItem}
              onClose={() => setDetailItem(null)}
              onAction={handleAction}
            />
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto">
              {intelligenceFeed && intelligenceFeed.length > 0 && (
                <div className="border-b p-4 pb-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Intelligence</h4>
                  <div className="space-y-1">
                    {intelligenceFeed.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-start gap-1.5 text-[11px]">
                        <span className={`shrink-0 size-1.5 mt-1 rounded-full ${
                          item.severity === "critical" ? "bg-red-500" :
                          item.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                        }`} />
                        <span className="text-muted-foreground">{item.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1" />
              <div className="border-t p-4">
                <ActivityFeed />
              </div>
            </div>
          )}
        </div>
      </div>

      <RapidActionBar
        selectedItems={selectedItems}
        onClearSelection={clearSelection}
        onActionComplete={handleAction}
        onStartSequential={handleStartSequential}
      />

      {showSessionPreview && (
        <SessionPreviewModal
          items={selectedItems}
          sessionId={sessionId}
          isCreating={isCreatingSession}
          onConfirm={handleConfirmSession}
          onCancel={() => {
            setShowSessionPreview(false);
            setSessionId(null);
          }}
        />
      )}

      {activeSendSession && (
        <SendController
          session={activeSendSession}
          onClose={() => setActiveSendSession(null)}
          onEditMessage={handleEditMessage}
        />
      )}

      {recoverySession && (
        <ResumeSessionModal
          session={recoverySession}
          onResume={handleResumeSession}
          onDiscard={handleDiscardSession}
          onClose={() => setRecoverySession(null)}
        />
      )}

      {failedActions.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[400px] max-w-[calc(100vw-2rem)]">
          <FailedActionsQueue
            failures={failedActions}
            onRetry={handleRetryFailedAction}
            onDismiss={(index) => setFailedActions((prev) => prev.filter((_, i) => i !== index))}
            onRetryAll={() => {
              setFailedActions([]);
              window.postMessage(
                {
                  type: "MICRONEST_SEQUENCE",
                  payload: { type: "RESUME_SEQUENCE", payload: { sessionId: activeSendSession?.id } },
                },
                "*"
              );
            }}
            onDismissAll={() => setFailedActions([])}
          />
        </div>
      )}

      {whatsappItem && whatsappPreview && (
        <MessagePreviewModal
          data={whatsappPreview.previewData}
          whatsappUrl={whatsappPreview.url}
          isOpening={isOpening}
          onEditMessage={setEditedMessage}
          onConfirm={handleConfirmWhatsApp}
          onCancel={() => {
            setWhatsappItem(null);
            setEditedMessage(null);
          }}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
