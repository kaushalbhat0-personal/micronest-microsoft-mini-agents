import type { DetectedColumn, PreviewResult, PreviewSummary } from "@/features/upload/types/normalized-row";
import type { ParsedSheet } from "./parse-sheet";
import { detectColumns } from "./detect-columns";
import { normalizeRows } from "./normalize-rows";
import { validateRows, computeSummary } from "./validate-rows";

export function buildPreviewFromParsed(parsed: ParsedSheet): {
  preview: PreviewResult;
  columns: DetectedColumn[];
} {
  const columns = detectColumns(parsed);
  const normalizedRows = normalizeRows(parsed.rawRows, columns);
  const rows = validateRows(normalizedRows);
  const base = computeSummary(rows);

  const unmappedColumns = columns.filter((c) => !c.mappedField).length;
  const highConfidence = columns.filter((c) => c.confidence === "high").length;
  const totalMapped = columns.filter((c) => c.mappedField).length;

  const summary: PreviewSummary = {
    ...base,
    unmappedColumns,
    mappingConfidence: totalMapped > 0
      ? Math.round((highConfidence / totalMapped) * 100)
      : 0,
  };

  return {
    preview: { rows, columns, summary },
    columns,
  };
}

export function buildPreviewFromMapping(
  rawRows: Record<string, string>[],
  columns: DetectedColumn[]
): {
  preview: PreviewResult;
} {
  const normalizedRows = normalizeRows(rawRows, columns);
  const rows = validateRows(normalizedRows);
  const base = computeSummary(rows);

  const unmappedColumns = columns.filter((c) => !c.mappedField).length;
  const highConfidence = columns.filter((c) => c.confidence === "high").length;
  const totalMapped = columns.filter((c) => c.mappedField).length;

  const summary: PreviewSummary = {
    ...base,
    unmappedColumns,
    mappingConfidence: totalMapped > 0
      ? Math.round((highConfidence / totalMapped) * 100)
      : 0,
  };

  return {
    preview: { rows, columns, summary },
  };
}
