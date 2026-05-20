import React, { useState, useCallback, useEffect } from "react";
import type { OperationalQueueItem } from "../../shared/types";
import { useContactDetail } from "../hooks/useContactDetail";
import { useNotes } from "../hooks/useNotes";
import { updateFollowupStatus, getContactAssignee, checkContactLock } from "../../shared/api";
import { ContactSuggestion } from "./ContactSuggestion";

const EVENT_LABELS: Record<string, string> = {
  contact_imported: "Imported",
  whatsapp_opened: "WhatsApp opened",
  followup_contacted: "Contacted",
  customer_responded: "Responded",
  payment_promised: "Promised",
  marked_resolved: "Resolved",
  followup_dismissed: "Dismissed",
  marked_ignored: "Ignored",
  followup_scheduled: "Follow-up scheduled",
  note_added: "Note added",
  session_started: "Session started",
  send_verified: "Send verified",
  send_failed: "Send failed",
};

const STATUS_ACTIONS = [
  { status: "responded", label: "Responded", className: "sp-btn-success" },
  { status: "promised", label: "Promised", className: "sp-btn" },
  { status: "resolved", label: "Resolved", className: "sp-btn" },
  { status: "dismissed", label: "Dismiss", className: "sp-btn-ghost" },
];

interface ContactDetailProps {
  item: OperationalQueueItem;
  onStatusChange: () => void;
}

export function ContactDetail({ item, onStatusChange }: ContactDetailProps) {
  const { contact, candidate } = item;
  const { timeline, loading: timelineLoading } = useContactDetail(contact.id);
  const { notes, loading: notesLoading, addNote } = useNotes(contact.id);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [assignee, setAssignee] = useState<string>();
  const [lockInfo, setLockInfo] = useState<string>();

  useEffect(() => {
    getContactAssignee(contact.id).then((result) => {
      if (result?.user_email) setAssignee(result.user_email);
    }).catch(() => {});
    checkContactLock(contact.id).then((lock) => {
      if (lock?.locked_by_name) setLockInfo(lock.locked_by_name);
    }).catch(() => {});
  }, [contact.id]);

  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    setUpdatingStatus(newStatus);
    await updateFollowupStatus(candidate.id, contact.id, newStatus);
    setUpdatingStatus(null);
    onStatusChange();
  }, [candidate.id, contact.id, onStatusChange]);

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await addNote(noteText.trim());
    setNoteText("");
    setAddingNote(false);
  }, [noteText, addNote]);

  const handleSendWhatsApp = useCallback(() => {
    const phone = contact.phone_number.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  }, [contact.phone_number]);

  const dueAmount = contact.due_amount;
  const dueDate = contact.due_date;
  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;

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
    <>
      <div className="sp-detail-header">
        <div className="sp-detail-name">{contact.customer_name}</div>
        <div className="sp-detail-phone">{contact.phone_number}</div>
        {assignee && <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Assigned to: {assignee}</div>}
        {lockInfo && <div style={{ fontSize: 11, color: "#d97706" }}>Currently handled by {lockInfo}</div>}
        <ContactSuggestion riskLevel="medium" escalationLevel={1} recoveryScore={65} intelligenceScore={72} intelligenceReasons={["High priority follow-up", "Promise due soon"]} />
        <div className="sp-detail-amount-row">
          {dueAmount != null && (
            <>
              <span>
                <span className="sp-detail-amount-label">Due: </span>
                <span className={`sp-detail-amount-value ${isOverdue ? "sp-due-amount" : ""}`}>
                  ₹{dueAmount.toLocaleString("en-IN")}
                </span>
              </span>
            </>
          )}
          {dueDate && (
            <span>
              <span className="sp-detail-amount-label">Due: </span>
              <span className="sp-detail-amount-value">{new Date(dueDate).toLocaleDateString("en-IN")}</span>
            </span>
          )}
        </div>
        <div className="sp-detail-status">
          <span className={`sp-badge sp-badge-${candidate.priority}`}>{candidate.priority}</span>
          <span className={`sp-badge sp-badge-${candidate.candidate_status}`}>{candidate.candidate_status}</span>
        </div>
      </div>

      <div className="sp-detail-actions">
        <button className="sp-btn sp-btn-primary sp-btn-sm" onClick={handleSendWhatsApp}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          WhatsApp
        </button>
        {STATUS_ACTIONS.map((action) => (
          <button
            key={action.status}
            className={`sp-btn sp-btn-sm ${action.className}`}
            onClick={() => handleStatusUpdate(action.status)}
            disabled={updatingStatus === action.status}
          >
            {updatingStatus === action.status ? "..." : action.label}
          </button>
        ))}
      </div>

      <div className="sp-detail-scroll">
        {/* Notes Section */}
        <div className="sp-section">
          <div className="sp-section-header">Notes</div>
          <div className="sp-notes">
            {notes.length === 0 && !notesLoading && (
              <div className="sp-text-muted sp-text-xs sp-mb-1">No notes yet</div>
            )}
            {notes.map((n) => (
              <div key={n.id} className="sp-notes-item">
                <div>{n.note}</div>
                <div className="sp-notes-item-time">{formatDate(n.created_at)}</div>
              </div>
            ))}
            <textarea
              className="sp-notes-input"
              placeholder="Add a note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
            />
            <button
              className="sp-btn sp-btn-sm sp-btn-primary sp-notes-submit"
              onClick={handleAddNote}
              disabled={addingNote || !noteText.trim()}
            >
              {addingNote ? "..." : "Add Note"}
            </button>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="sp-section">
          <div className="sp-section-header">Timeline</div>
          <div className="sp-timeline">
            {timeline.length === 0 && !timelineLoading && (
              <div className="sp-text-muted sp-text-xs">No events yet</div>
            )}
            {timeline.map((event) => (
              <div key={event.id} className="sp-timeline-item">
                <div className="sp-timeline-dot" />
                <div className="sp-timeline-line" />
                <div className="sp-timeline-content">
                  <div className="sp-timeline-text">
                    {EVENT_LABELS[event.event_type] ?? event.event_type}
                  </div>
                  <div className="sp-timeline-time">{formatDate(event.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
