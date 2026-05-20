import React, { useState, useEffect, useRef, useCallback } from "react";
import { getRecentLogs, clearLogs } from "../../shared/logger";
import type { LogEntry } from "../../shared/logger";
import { getTraces, clearTraces } from "../../shared/message-trace";
import type { TraceEntry } from "../../shared/message-trace";
import type { SequentialSessionInfo, RecoveryStatus } from "../../shared/types";

interface RuntimeInspectorProps {
  sessionStatus: SequentialSessionInfo | null;
  extensionConnected: boolean;
}

interface PerfData {
  renderCount: number;
  messageLatencies: number[];
  storageWrites: number;
}

const FEATURE_FLAG_KEYS = [
  "showContactDetail",
  "enableAutoRefresh",
  "enableDragHandle",
  "enableAnalytics",
  "experimentalRetry",
  "showRawPayload",
];

function getFlags(): Record<string, boolean> {
  const global = (window as any).__MICRONEST_FLAGS__;
  if (global && typeof global === "object") return { ...global };
  const stored: Record<string, boolean> = {};
  for (const key of FEATURE_FLAG_KEYS) {
    try {
      const val = localStorage.getItem(`micronest_flag_${key}`);
      if (val !== null) stored[key] = val === "true";
    } catch {}
  }
  return stored;
}

function setFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(`micronest_flag_${key}`, String(value));
  } catch {}
}

function levelColor(level: string): string {
  switch (level) {
    case "error": return "#ef4444";
    case "warn": return "#f59e0b";
    case "info": return "#3b82f6";
    default: return "#6b7280";
  }
}

const section: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  padding: "6px 8px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 4,
};

const monospace: React.CSSProperties = {
  fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
  fontSize: 10,
  lineHeight: 1.5,
};

export function RuntimeInspector({ sessionStatus, extensionConnected }: RuntimeInspectorProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [recovery, setRecovery] = useState<RecoveryStatus | null>(null);
  const [perf, setPerf] = useState<PerfData>({ renderCount: 0, messageLatencies: [], storageWrites: 0 });
  const [flags, setFlags] = useState<Record<string, boolean>>(getFlags);
  const [activeTab, setActiveTab] = useState<string>("logs");
  const renderCountRef = useRef(0);

  renderCountRef.current++;

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(getRecentLogs(20));
      setTraces(getTraces(50));
      setPerf(prev => ({ ...prev, renderCount: renderCountRef.current }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchRecovery() {
      try {
        const res = await chrome.runtime.sendMessage({ type: "GET_RECOVERY_STATUS" });
        setRecovery(res ?? null);
      } catch {}
    }
    if (!collapsed) {
      fetchRecovery();
      const interval = setInterval(fetchRecovery, 5000);
      return () => clearInterval(interval);
    }
  }, [collapsed]);

  useEffect(() => {
    if (collapsed) return;
    function handler(changes: Record<string, chrome.storage.StorageChange>, area: string) {
      if (area === "local") {
        setPerf(prev => ({ ...prev, storageWrites: prev.storageWrites + Object.keys(changes).length }));
      }
    }
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, [collapsed]);

  const handleToggleFlag = useCallback((key: string) => {
    setFlags(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setFlag(key, next[key]);
      return next;
    });
  }, []);

  const handleClearLogs = useCallback(() => {
    clearLogs();
    setLogs([]);
  }, []);

  const handleClearTraces = useCallback(() => {
    clearTraces();
    setTraces([]);
  }, []);

  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3px 8px",
          cursor: "pointer",
          userSelect: "none",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "1px 8px",
            borderRadius: 8,
            background: "rgba(217, 119, 6, 0.15)",
            color: "#d97706",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.3px",
          }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
            <path d="M6 0a6 6 0 110 12A6 6 0 016 0zm.5 2.5v3h3v1h-3v3h-1v-3h-3v-1h3v-3h1z" transform="rotate(45 8 8)" />
          </svg>
          Debug
        </span>
      </div>
    );
  }

  const tabs = [
    { id: "logs", label: "Logs" },
    { id: "traces", label: "Traces" },
    { id: "session", label: "Session" },
    { id: "perf", label: "Perf" },
    { id: "flags", label: "Flags" },
  ];

  return (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "var(--bg-primary, #0f172a)",
        fontSize: 11,
        color: "var(--text-primary, #e2e8f0)",
        maxHeight: 320,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onClick={() => setCollapsed(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 8px",
          cursor: "pointer",
          userSelect: "none",
          background: "rgba(217, 119, 6, 0.08)",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Debug Inspector
        </span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <line x1="4" y1="12" x2="12" y2="4" />
          <line x1="12" y1="12" x2="4" y2="4" />
        </svg>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 4px" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "4px 2px",
              border: "none",
              background: activeTab === tab.id ? "rgba(255,255,255,0.06)" : "transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
              fontSize: 9,
              fontWeight: 500,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              borderBottom: activeTab === tab.id ? "2px solid #d97706" : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {activeTab === "logs" && (
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={sectionTitle}>Runtime Events</div>
              <button
                onClick={handleClearLogs}
                style={{
                  background: "none", border: "none", color: "var(--text-secondary)",
                  fontSize: 9, cursor: "pointer", padding: 0, textDecoration: "underline",
                }}
              >
                Clear
              </button>
            </div>
            {logs.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 10, fontStyle: "italic" }}>No log entries</div>
            ) : (
              logs.map((entry, i) => (
                <LogRow key={i} entry={entry} />
              ))
            )}
          </div>
        )}

        {activeTab === "traces" && (
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={sectionTitle}>Message Trace</div>
              <button
                onClick={handleClearTraces}
                style={{
                  background: "none", border: "none", color: "var(--text-secondary)",
                  fontSize: 9, cursor: "pointer", padding: 0, textDecoration: "underline",
                }}
              >
                Clear
              </button>
            </div>
            {traces.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 10, fontStyle: "italic" }}>No traced messages</div>
            ) : (
              traces.slice(-20).reverse().map((entry, i) => (
                <TraceRow key={i} entry={entry} />
              ))
            )}
          </div>
        )}

        {activeTab === "session" && (
          <div style={section}>
            <div style={sectionTitle}>Session State</div>
            {sessionStatus ? (
              <div style={monospace}>
                <KVRow k="State" v={sessionStatus.state} badge={sessionStatus.state} />
                <KVRow k="Progress" v={`${sessionStatus.currentIndex}/${sessionStatus.totalCount}`} />
                <KVRow k="Contact" v={sessionStatus.currentContactName} />
                <KVRow k="Sent" v={String(sessionStatus.counters.sent)} />
                <KVRow k="Skipped" v={String(sessionStatus.counters.skipped)} />
                <KVRow k="Failed" v={String(sessionStatus.counters.failed)} />
                <KVRow k="Delay" v={sessionStatus.delayRemainingMs > 0 ? `${Math.round(sessionStatus.delayRemainingMs / 1000)}s` : "0s"} />
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>No active session</div>
            )}
            <div style={{ ...sectionTitle, marginTop: 6 }}>Recovery Status</div>
            <div style={monospace}>
              <KVRow k="Recovered" v={recovery ? String(recovery.hasRecoveredSession) : "unknown"} />
              <KVRow k="WhatsApp" v={recovery ? (recovery.whatsappConnected ? "connected" : "disconnected") : "unknown"} />
              <KVRow k="Ext Connected" v={String(extensionConnected)} />
            </div>
          </div>
        )}

        {activeTab === "perf" && (
          <div style={section}>
            <div style={sectionTitle}>Performance</div>
            <div style={monospace}>
              <KVRow k="Render Count" v={String(perf.renderCount)} />
              <KVRow k="Msg Lat Avg" v={perf.messageLatencies.length > 0 ? `${Math.round(perf.messageLatencies.reduce((a, b) => a + b, 0) / perf.messageLatencies.length)}ms` : "N/A"} />
              <KVRow k="Storage Writes" v={String(perf.storageWrites)} />
            </div>
          </div>
        )}

        {activeTab === "flags" && (
          <div style={section}>
            <div style={sectionTitle}>Feature Flags</div>
            {FEATURE_FLAG_KEYS.map(key => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                <button
                  onClick={() => handleToggleFlag(key)}
                  style={{
                    width: 24,
                    height: 12,
                    borderRadius: 6,
                    border: "none",
                    background: flags[key] ? "#d97706" : "rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    position: "relative",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 1,
                      left: flags[key] ? 13 : 1,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.15s",
                    }}
                  />
                </button>
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasPayload = entry.data !== undefined;
  return (
    <div style={{ marginBottom: 2 }}>
      <div
        style={{ display: "flex", alignItems: "baseline", gap: 4, cursor: hasPayload ? "pointer" : undefined }}
        onClick={() => hasPayload && setExpanded(!expanded)}
      >
        <span style={{ color: "var(--text-secondary)", fontSize: 9, flexShrink: 0, fontFamily: monospace.fontFamily }}>
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 9,
            fontWeight: 600,
            padding: "0 4px",
            borderRadius: 3,
            background: `${levelColor(entry.level)}22`,
            color: levelColor(entry.level),
          }}
        >
          {entry.level}
        </span>
        <span style={{ fontSize: 9, color: "var(--text-secondary)", flexShrink: 0 }}>{entry.namespace}</span>
        <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {entry.message}
        </span>
      </div>
      {expanded && entry.data !== undefined && (
        <pre style={{ ...monospace, margin: "2px 0 2px 16px", color: "var(--text-secondary)", fontSize: 9, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function TraceRow({ entry }: { entry: TraceEntry }) {
  const dirColor = entry.direction === "sent" ? "#3b82f6" : "#8b5cf6";
  const successColor = entry.success ? "#22c55e" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
      <span style={{ color: "var(--text-secondary)", fontSize: 9, fontFamily: monospace.fontFamily, flexShrink: 0 }}>
        {new Date(entry.timestamp).toLocaleTimeString()}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 9,
          fontWeight: 600,
          padding: "0 4px",
          borderRadius: 3,
          background: `${dirColor}22`,
          color: dirColor,
        }}
      >
        {entry.direction}
      </span>
      <span style={{ fontSize: 10, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entry.type}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 9,
          fontWeight: 600,
          padding: "0 4px",
          borderRadius: 3,
          background: `${successColor}22`,
          color: successColor,
        }}
      >
        {entry.success ? "OK" : "FAIL"}
      </span>
      {entry.latencyMs !== undefined && (
        <span style={{ color: "var(--text-secondary)", fontSize: 9, flexShrink: 0 }}>
          {entry.latencyMs}ms
        </span>
      )}
    </div>
  );
}

function KVRow({ k, v, badge }: { k: string; v: string; badge?: string }) {
  const badgeColor = badge
    ? badge === "sending" ? "#3b82f6"
      : badge === "paused" ? "#f59e0b"
      : badge === "completed" ? "#22c55e"
      : badge === "stopped" || badge === "failed" ? "#ef4444"
      : "#6b7280"
    : undefined;
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 1 }}>
      <span style={{ color: "var(--text-secondary)", minWidth: 80 }}>{k}:</span>
      {badge ? (
        <span
          style={{
            padding: "0 4px",
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
            background: `${badgeColor}22`,
            color: badgeColor,
          }}
        >
          {v}
        </span>
      ) : (
        <span>{v}</span>
      )}
    </div>
  );
}
