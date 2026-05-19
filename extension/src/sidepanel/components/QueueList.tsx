import React from "react";
import type { OperationalQueueItem } from "../../shared/types";

interface QueueListProps {
  items: OperationalQueueItem[];
  loading: boolean;
  onSelect: (item: OperationalQueueItem) => void;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function QueueList({ items, loading, onSelect }: QueueListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  if (loading) {
    return <div className="sp-empty-state">Loading queue...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="sp-no-items">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <div>No contacts in queue</div>
        <div style={{ fontSize: 11 }}>Upload a file or import contacts to get started</div>
      </div>
    );
  }

  const sorted = [...items].sort(
    (a, b) => PRIORITY_ORDER[a.candidate.priority] - PRIORITY_ORDER[b.candidate.priority]
  );

  return (
    <div>
      {sorted.map((item) => (
        <QueueCard
          key={item.candidate.id}
          item={item}
          isActive={activeId === item.candidate.id}
          onClick={() => {
            setActiveId(item.candidate.id);
            onSelect(item);
          }}
        />
      ))}
    </div>
  );
}

function QueueCard({
  item,
  isActive,
  onClick,
}: {
  item: OperationalQueueItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const { contact, candidate } = item;
  const dueAmount = contact.due_amount;
  const dueDate = contact.due_date;
  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;

  const statusBadge = (status: string) => {
    const cls = `sp-badge sp-badge-${status}`;
    return <span className={cls}>{status}</span>;
  };

  return (
    <div className={`sp-queue-card ${isActive ? "active" : ""}`} onClick={onClick}>
      <div className="sp-queue-card-info">
        <div className="sp-queue-card-name">{contact.customer_name}</div>
        <div className="sp-queue-card-meta">
          <span className={`sp-badge sp-badge-${candidate.priority}`}>{candidate.priority}</span>
          {statusBadge(candidate.candidate_status)}
          {dueAmount != null && (
            <span className={`sp-queue-card-amount ${isOverdue ? "sp-due-amount" : ""}`}>
              ₹{dueAmount.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}
