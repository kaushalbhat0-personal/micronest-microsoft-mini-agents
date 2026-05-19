"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import type { QueueFilter } from "@/features/operations/types";

interface QueueFiltersProps {
  filters: QueueFilter;
  onUpdateFilter: <K extends keyof QueueFilter>(key: K, value: QueueFilter[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  totalCount: number;
  filteredCount: number;
}

const PRIORITY_OPTIONS = [
  { value: "high", label: "High Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "low", label: "Low Priority" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "opened", label: "WhatsApp Opened" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "promised", label: "Promised" },
];

export function QueueFilters({
  filters,
  onUpdateFilter,
  onReset,
  hasActiveFilters,
  inputRef,
  totalCount,
  filteredCount,
}: QueueFiltersProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={filters.search}
          onChange={(e) => onUpdateFilter("search", e.target.value)}
          placeholder="Search name, phone, amount... (/)"
          className="h-8 pl-8 text-xs"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onUpdateFilter("search", "")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          value={filters.priority ?? ""}
          onChange={(e) => onUpdateFilter("priority", e.target.value || null)}
          className="h-7 rounded-md border bg-transparent px-2 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={filters.status ?? ""}
          onChange={(e) => onUpdateFilter("status", e.target.value || null)}
          className="h-7 rounded-md border bg-transparent px-2 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onUpdateFilter("overdue", !filters.overdue)}
          className={`h-7 rounded-md border px-2 text-[11px] transition-colors ${
            filters.overdue
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200"
              : "bg-transparent text-muted-foreground hover:bg-muted"
          }`}
        >
          Overdue
        </button>

        <button
          type="button"
          onClick={() => onUpdateFilter("scheduledToday", !filters.scheduledToday)}
          className={`h-7 rounded-md border px-2 text-[11px] transition-colors ${
            filters.scheduledToday
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200"
              : "bg-transparent text-muted-foreground hover:bg-muted"
          }`}
        >
          Scheduled Today
        </button>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            className="h-7 text-[11px] text-muted-foreground"
          >
            <X className="size-3 mr-0.5" />
            Clear
          </Button>
        )}

        <span className="text-[11px] text-muted-foreground ml-auto">
          {filteredCount} / {totalCount}
        </span>
      </div>
    </div>
  );
}
