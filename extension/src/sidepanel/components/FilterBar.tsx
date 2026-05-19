import React from "react";

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  priorityFilter: string | null;
  onPriorityFilterChange: (v: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (v: string | null) => void;
}

const PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "promised", label: "Promised" },
];

export function FilterBar({
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
}: FilterBarProps) {
  return (
    <div className="sp-filter-bar">
      <input
        className="sp-search-input"
        type="search"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="sp-filter-chips">
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            className={`sp-btn sp-btn-sm ${priorityFilter === p.value ? "sp-btn-primary" : ""}`}
            onClick={() => onPriorityFilterChange(priorityFilter === p.value ? null : p.value)}
          >
            {p.label}
          </button>
        ))}
        {STATUSES.map((s) => (
          <button
            key={s.value}
            className={`sp-btn sp-btn-sm ${statusFilter === s.value ? "sp-btn-primary" : ""}`}
            onClick={() => onStatusFilterChange(statusFilter === s.value ? null : s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
