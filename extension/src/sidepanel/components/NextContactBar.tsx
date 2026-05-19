import React from "react";

interface NextContactBarProps {
  currentName: string;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onBack: () => void;
}

export function NextContactBar({
  currentName,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onBack,
}: NextContactBarProps) {
  return (
    <div className="sp-next-bar">
      <button className="sp-btn sp-btn-ghost sp-btn-sm" onClick={onBack}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <div style={{ flex: 1, textAlign: "center", minWidth: 0, padding: "0 4px" }}>
        <div className="sp-next-label">Current</div>
        <div className="sp-next-name sp-truncate">{currentName}</div>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        <button
          className="sp-btn sp-btn-ghost sp-btn-sm"
          onClick={onPrev}
          disabled={!hasPrev}
          title="Previous contact"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="sp-btn sp-btn-ghost sp-btn-sm"
          onClick={onNext}
          disabled={!hasNext}
          title="Next contact"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
