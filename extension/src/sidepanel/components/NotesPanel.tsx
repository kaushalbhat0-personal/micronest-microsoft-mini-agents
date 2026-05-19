import React, { useState, useCallback } from "react";
import type { ContactNote } from "../../shared/types";

interface NotesPanelProps {
  notes: ContactNote[];
  loading: boolean;
  onAddNote: (text: string) => Promise<boolean>;
}

export function NotesPanel({ notes, loading, onAddNote }: NotesPanelProps) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    setAdding(true);
    await onAddNote(text.trim());
    setText("");
    setAdding(false);
  }, [text, onAddNote]);

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="sp-notes" style={{ flex: 1 }}>
      {loading && notes.length === 0 ? (
        <div className="sp-text-muted sp-text-xs">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="sp-text-muted sp-text-xs sp-mb-1">No notes yet</div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="sp-notes-item">
            <div>{n.note}</div>
            <div className="sp-notes-item-time">{formatDate(n.created_at)}</div>
          </div>
        ))
      )}
      <textarea
        className="sp-notes-input"
        placeholder="Add a note..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
      />
      <button
        className="sp-btn sp-btn-sm sp-btn-primary sp-notes-submit"
        onClick={handleSubmit}
        disabled={adding || !text.trim()}
      >
        {adding ? "Adding..." : "Add Note"}
      </button>
    </div>
  );
}
