"use client";

import { useState, useCallback, useMemo } from "react";
import type { OperationalQueueItem } from "@/features/followups/types";

export function useBulkSelection(items: OperationalQueueItem[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((candidateId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.candidate.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.candidate.id)),
    [items, selectedIds]
  );

  const selectAcrossItems = useCallback(
    (visibleItems: OperationalQueueItem[]) => {
      const next = new Set<string>();
      for (const item of visibleItems) {
        next.add(item.candidate.id);
      }
      setSelectedIds(next);
    },
    []
  );

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    selectNone,
    selectAcrossItems,
    isSelected: useCallback((id: string) => selectedIds.has(id), [selectedIds]),
  };
}
