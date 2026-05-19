import { findFieldByHeader } from "@/shared/constants/column-aliases";
import type { MappedField, DetectedColumn } from "@/features/upload/types/normalized-row";
import type { ParsedSheet } from "./parse-sheet";

export { type DetectedColumn };

export function detectColumns(parsed: ParsedSheet): DetectedColumn[] {
  return parsed.headers.map((header) => {
    const { field, confidence } = findFieldByHeader(header);
    return {
      header,
      mappedField: field,
      confidence,
    };
  });
}

export function buildColumnMap(
  columns: DetectedColumn[]
): Record<string, MappedField> {
  const map: Record<string, MappedField> = {};
  for (const col of columns) {
    if (col.mappedField) {
      map[col.header] = col.mappedField;
    }
  }
  return map;
}

export function applyUserMapping(
  columns: DetectedColumn[],
  userMapping: Record<string, MappedField | "ignore">
): DetectedColumn[] {
  return columns.map((col) => {
    const override = userMapping[col.header];
    if (override === "ignore") {
      return { ...col, mappedField: null, confidence: null };
    }
    if (override) {
      return { ...col, mappedField: override, confidence: "high" };
    }
    return col;
  });
}
