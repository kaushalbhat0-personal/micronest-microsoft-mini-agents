import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { OperationalQueueItem, SequentialSessionInfo } from "../shared/types";
import {
  fetchOperationalQueue,
  cacheQueue,
  getCachedQueue,
  getRecoveryStatus,
  listenForSessionStatus,
  signOut as apiSignOut,
  setSession,
  getCurrentSession,
  getActiveWorkspace,
} from "../shared/api";
import { useAuth } from "./hooks/useAuth";
import { FilterBar } from "./components/FilterBar";
import { QueueList } from "./components/QueueList";
import { ContactDetail } from "./components/ContactDetail";
import { RuntimeStatus } from "./components/RuntimeStatus";
import { NextContactBar } from "./components/NextContactBar";
import { RuntimeInspector } from "./components/RuntimeInspector";
import { useDebugMode } from "../hooks/useDebugMode";
import { traceMessage } from "../shared/message-trace";

type View = "queue" | "detail";

export function App() {
  const { session, loading: authLoading, error: authError } = useAuth();

  const [view, setView] = useState<View>("queue");
  const [queue, setQueue] = useState<OperationalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<OperationalQueueItem | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SequentialSessionInfo | null>(null);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const { isDebug, toggleDebug } = useDebugMode();

  const filteredQueue = useMemo(() => {
    let items = queue;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.contact.customer_name.toLowerCase().includes(q) ||
          i.contact.phone_number.includes(q)
      );
    }
    if (priorityFilter) {
      items = items.filter((i) => i.candidate.priority === priorityFilter);
    }
    if (statusFilter) {
      items = items.filter((i) => i.candidate.candidate_status === statusFilter);
    }
    return items;
  }, [queue, search, priorityFilter, statusFilter]);

  useEffect(() => {
    if (!session) return;
    setSession(session);
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      try {
        const items = await fetchOperationalQueue();
        if (!cancelled) {
          setQueue(items);
          await cacheQueue(items);
        }
      } catch {
        if (!cancelled) {
          const cached = await getCachedQueue();
          if (cached) setQueue(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    getActiveWorkspace().then((w) => {
      if (w) {
        setWorkspaceId(w.id);
        setWorkspaceName(w.name);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function checkRecovery() {
      try {
        const status = await getRecoveryStatus();
        if (!cancelled && status) {
          setSessionStatus(status.session);
          setExtensionConnected(true);
          traceMessage("GET_RECOVERY_STATUS", "received", true, undefined, status);
        }
      } catch {
        if (!cancelled) {
          setExtensionConnected(false);
          traceMessage("GET_RECOVERY_STATUS", "received", false);
        }
      }
    }
    checkRecovery();
    const interval = setInterval(checkRecovery, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const unsub = listenForSessionStatus((status) => {
      setSessionStatus(status);
      setExtensionConnected(true);
      traceMessage("MICRONEST_SEQUENCE_STATUS", "received", true, undefined, { state: status.state, index: status.currentIndex });
    });
    return unsub;
  }, []);

  const handleSelectContact = useCallback((item: OperationalQueueItem) => {
    setSelectedItem(item);
    setView("detail");
  }, []);

  const handleBack = useCallback(() => {
    setView("queue");
    setSelectedItem(null);
  }, []);

  const handleNextContact = useCallback(() => {
    if (!selectedItem) return;
    const idx = filteredQueue.findIndex(
      (i) => i.candidate.id === selectedItem.candidate.id
    );
    if (idx < filteredQueue.length - 1) {
      setSelectedItem(filteredQueue[idx + 1]);
    }
  }, [selectedItem, filteredQueue]);

  const handlePrevContact = useCallback(() => {
    if (!selectedItem) return;
    const idx = filteredQueue.findIndex(
      (i) => i.candidate.id === selectedItem.candidate.id
    );
    if (idx > 0) {
      setSelectedItem(filteredQueue[idx - 1]);
    }
  }, [selectedItem, filteredQueue]);

  const handleQueueRefresh = useCallback(async () => {
    if (!getCurrentSession()) return;
    let cancelled = false;
    const start = Date.now();
    setLoading(true);
    try {
      const items = await fetchOperationalQueue();
      if (!cancelled) {
        setQueue(items);
        await cacheQueue(items);
        traceMessage("QUEUE_REFRESH", "received", true, Date.now() - start);
      }
    } catch {
      if (!cancelled) {
        const cached = await getCachedQueue();
        if (cached) setQueue(cached);
        traceMessage("QUEUE_REFRESH", "received", false, Date.now() - start);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  const handleLogout = useCallback(async () => {
    await apiSignOut();
  }, []);

  if (authLoading) {
    return (
      <div className="sp-auth">
        <div className="sp-auth-logo">M</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="sp-auth">
        <div className="sp-auth-logo">M</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>MicroNest</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 8 }}>
          Sign in to continue
        </div>
        {authError && <div className="sp-auth-error">{authError}</div>}
        <LoginForm />
      </div>
    );
  }

  return (
    <>
      <Header workspaceName={workspaceName} onLogout={handleLogout} onRefresh={handleQueueRefresh} isDebug={isDebug} onToggleDebug={() => setShowDebug(s => !s)} />

      {view === "detail" && selectedItem ? (
        <div className="sp-detail" style={{ flex: 1, overflow: "hidden" }}>
          <NextContactBar
            currentName={selectedItem.contact.customer_name}
            hasNext={filteredQueue.indexOf(selectedItem) < filteredQueue.length - 1}
            hasPrev={filteredQueue.indexOf(selectedItem) > 0}
            onNext={handleNextContact}
            onPrev={handlePrevContact}
            onBack={handleBack}
          />
          <ContactDetail item={selectedItem} onStatusChange={handleQueueRefresh} />
        </div>
      ) : (
        <div className="sp-content">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          <div className="sp-queue-scroll">
            <QueueList
              items={filteredQueue}
              loading={loading}
              onSelect={handleSelectContact}
            />
          </div>
        </div>
      )}

      {showDebug && (
        <RuntimeInspector
          sessionStatus={sessionStatus}
          extensionConnected={extensionConnected}
        />
      )}

      <BottomBar
        sessionStatus={sessionStatus}
        extensionConnected={extensionConnected}
        queueCount={queue.length}
        workspaceId={workspaceId}
      />
    </>
  );
}

function Header({ onLogout, onRefresh, workspaceName, isDebug, onToggleDebug }: { onLogout: () => void; onRefresh: () => void; workspaceName: string | null; isDebug: boolean; onToggleDebug: () => void }) {
  return (
    <div className="sp-header">
      <div className="sp-header-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        MicroNest{workspaceName && <span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 4 }}>{workspaceName}</span>}
        {isDebug && (
          <span
            onClick={onToggleDebug}
            style={{
              marginLeft: 6,
              padding: "1px 6px",
              borderRadius: 8,
              background: "rgba(217, 119, 6, 0.15)",
              color: "#d97706",
              fontSize: 9,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.3px",
            }}
          >
            Debug
          </span>
        )}
      </div>
      <div className="sp-header-actions">
        <button className="sp-btn-icon" onClick={onRefresh} title="Refresh queue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
        <button className="sp-btn-icon" onClick={onLogout} title="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signIn(email, password);
    if (err) setError(err);
    setSubmitting(false);
  };

  return (
    <form className="sp-auth-form" onSubmit={handleSubmit}>
      <input
        className="sp-auth-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
      />
      <input
        className="sp-auth-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="sp-auth-error">{error}</div>}
      <button className="sp-btn sp-btn-primary sp-auth-submit" type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

function BottomBar({
  sessionStatus,
  extensionConnected,
  queueCount,
  workspaceId,
}: {
  sessionStatus: SequentialSessionInfo | null;
  extensionConnected: boolean;
  queueCount: number;
  workspaceId: string | null;
}) {
  const hasSession = !!sessionStatus && sessionStatus.state !== "completed" && sessionStatus.state !== "stopped";

  return (
    <div className="sp-bottom-bar">
      {hasSession ? (
        <RuntimeStatus session={sessionStatus!} />
      ) : (
        <>
          <span className={`sp-status-dot ${extensionConnected ? "connected" : "disconnected"}`} />
          <span>{extensionConnected ? "Extension connected" : "Extension disconnected"}</span>
          <span style={{ flex: 1 }} />
          <span>{queueCount} contacts</span>
        </>
      )}
    </div>
  );
}
