"use client";

import { useState, useMemo, useCallback } from "react";
import type { OperationalQueueItem } from "@/features/followups/types";
import type { QueueFilter } from "@/features/operations/types";

export function useQueueFiltering(items: OperationalQueueItem[]) {
  const [filters, setFilters] = useState<QueueFilter>({
    search: "",
    priority: null,
    status: null,
    overdue: false,
    scheduledToday: false,
  });

  const updateFilter = useCallback(
    <K extends keyof QueueFilter>(key: K, value: QueueFilter[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const todayStr = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ search: "", priority: null, status: null, overdue: false, scheduledToday: false });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.search !== "" || filters.priority !== null || filters.status !== null || filters.overdue || filters.scheduledToday;
  }, [filters]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.contact.customer_name?.toLowerCase().includes(q) ||
          i.contact.phone_number?.includes(q) ||
          (i.contact.due_amount !== null &&
            String(i.contact.due_amount).includes(q))
      );
    }

    if (filters.priority) {
      result = result.filter((i) => i.candidate.priority === filters.priority);
    }

    if (filters.status) {
      result = result.filter((i) => i.candidate.candidate_status === filters.status);
    }

    if (filters.overdue) {
      result = result.filter((i) => {
        if (!i.contact.due_date) return false;
        return new Date(i.contact.due_date) < new Date(todayStr);
      });
    }

    if (filters.scheduledToday) {
      result = result.filter((i) => {
        if (!i.contact.next_followup_at) return false;
        const nextDate = new Date(i.contact.next_followup_at);
        return nextDate >= new Date(todayStr) && nextDate < new Date(new Date(todayStr).getTime() + 86400000);
      });
    }

    return result;
  }, [items, filters, todayStr]);

  return {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    filteredItems,
  };
}
