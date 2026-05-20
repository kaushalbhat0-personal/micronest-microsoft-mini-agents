import React from "react";

interface ContactSuggestionProps {
  riskLevel?: string;
  escalationLevel?: number;
  recoveryScore?: number;
  intelligenceScore?: number;
  intelligenceReasons?: string[];
}

export function ContactSuggestion({ riskLevel, escalationLevel, recoveryScore, intelligenceScore, intelligenceReasons }: ContactSuggestionProps) {
  const riskColor = riskLevel === "critical" ? "var(--danger)" : riskLevel === "high" ? "var(--warning)" : "var(--text-secondary)";
  return (
    <div style={{ marginTop: 8, padding: "6px 8px", background: "var(--bg-secondary)", borderRadius: 6, fontSize: 11 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        {riskLevel && (
          <span style={{ color: riskColor, fontWeight: 600 }}>
            {riskLevel.toUpperCase()} Risk
          </span>
        )}
        {escalationLevel != null && escalationLevel > 0 && (
          <span style={{ color: "var(--warning)", fontWeight: 600 }}>
            E{escalationLevel}
          </span>
        )}
        {recoveryScore != null && (
          <span style={{ color: "var(--text-secondary)" }}>
            Recovery: {recoveryScore}
          </span>
        )}
      </div>
      {intelligenceReasons && intelligenceReasons.length > 0 && (
        <div style={{ color: "var(--text-secondary)" }}>
          {intelligenceReasons.slice(0, 2).map((r, i) => (
            <div key={i}>· {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}
