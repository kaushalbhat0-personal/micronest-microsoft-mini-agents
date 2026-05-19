import React, { useState, useCallback } from "react";
import type { SequentialSessionInfo } from "../../shared/types";
import { sendSessionAction } from "../../shared/api";

interface RuntimeStatusProps {
  session: SequentialSessionInfo;
}

export function RuntimeStatus({ session }: RuntimeStatusProps) {
  const [acting, setActing] = useState<string | null>(null);

  const progress = session.totalCount > 0
    ? Math.round((session.currentIndex / session.totalCount) * 100)
    : 0;

  const isRunning = session.state === "sending";
  const isPaused = session.state === "paused";
  const isDone = session.state === "completed" || session.state === "stopped";

  const handleAction = useCallback(async (type: string) => {
    setActing(type);
    await sendSessionAction(type, session.id);
    setActing(null);
  }, [session.id]);

  if (isDone) {
    return (
      <div className="sp-runtime" style={{ borderBottom: "none" }}>
        <div className="sp-runtime-row">
          <span>Session {session.state}</span>
          <div className="sp-runtime-stats">
            <span className="sp-runtime-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {session.counters.sent}
            </span>
            {session.counters.failed > 0 && (
              <span className="sp-runtime-stat" style={{ color: "var(--danger)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {session.counters.failed}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <div className="sp-runtime-row">
        <span>{session.currentContactName}</span>
        <div className="sp-runtime-stats">
          <span className="sp-runtime-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {session.counters.sent}
          </span>
          <span className="sp-runtime-stat" style={{ color: "var(--warning)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 003.51 15" />
            </svg>
            {session.counters.skipped}
          </span>
          {session.counters.failed > 0 && (
            <span className="sp-runtime-stat" style={{ color: "var(--danger)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {session.counters.failed}
            </span>
          )}
        </div>
      </div>
      <div className="sp-runtime-progress">
        <div className="sp-runtime-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="sp-runtime-row">
        <span>{session.currentIndex}/{session.totalCount}</span>
        {session.delayRemainingMs > 0 && (
          <span>{Math.round(session.delayRemainingMs / 1000)}s</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
        {isRunning && (
          <button className="sp-btn sp-btn-sm sp-btn-danger" onClick={() => handleAction("PAUSE_SEQUENCE")} disabled={acting === "PAUSE_SEQUENCE"}>
            Pause
          </button>
        )}
        {isPaused && (
          <button className="sp-btn sp-btn-sm sp-btn-primary" onClick={() => handleAction("RESUME_SEQUENCE")} disabled={acting === "RESUME_SEQUENCE"}>
            Resume
          </button>
        )}
        <button className="sp-btn sp-btn-sm sp-btn-danger" onClick={() => handleAction("STOP_SEQUENCE")} disabled={acting === "STOP_SEQUENCE"}>
          Stop
        </button>
        <button className="sp-btn sp-btn-sm" onClick={() => handleAction("SKIP_CURRENT")} disabled={acting === "SKIP_CURRENT"}>
          Skip
        </button>
      </div>
    </div>
  );
}
