"use client";

import type { DetectedColumn } from "@/features/upload/types/normalized-row";

interface SummaryBarProps {
  totalRows: number;
  columns: DetectedColumn[];
  mappingConfidence: number;
}

export function SummaryBar({ totalRows, columns, mappingConfidence }: SummaryBarProps) {
  const mapped = columns.filter((c) => c.mappedField).length;
  const unmapped = columns.filter((c) => !c.mappedField).length;

  const fieldCounts = new Map<string, number>();
  for (const col of columns) {
    if (col.mappedField) {
      fieldCounts.set(col.mappedField, (fieldCounts.get(col.mappedField) ?? 0) + 1);
    }
  }
  const duplicateConflicts = [...fieldCounts.values()].filter((c) => c > 1).length;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-lg border bg-card text-xs">
      <span className="font-medium">{totalRows} rows</span>
      <span className="text-muted-foreground">·</span>
      <span>{mapped} mapped</span>
      {unmapped > 0 && <span className="text-destructive">{unmapped} unmapped</span>}
      <span className="text-muted-foreground">·</span>
      <span>Confidence: {mappingConfidence}%</span>
      {duplicateConflicts > 0 && (
        <span className="text-amber-600 font-medium">
          {duplicateConflicts} duplicate field{duplicateConflicts > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
