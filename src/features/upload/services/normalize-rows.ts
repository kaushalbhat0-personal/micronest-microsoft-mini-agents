import type { NormalizedContactRow, MappedField, DetectedColumn } from "@/features/upload/types/normalized-row";
import { buildColumnMap } from "./detect-columns";
import { normalizePhone } from "@/shared/utils/phone";
import { normalizeDate } from "@/shared/utils/date";
import { normalizeAmount } from "@/shared/utils/currency";

function extractString(
  row: Record<string, string>,
  map: Record<string, MappedField>,
  field: MappedField
): string {
  const header = Object.entries(map).find(([, v]) => v === field)?.[0];
  return header ? (row[header] ?? "").trim() : "";
}

function extractNumber(
  row: Record<string, string>,
  map: Record<string, MappedField>,
  field: MappedField
): number | null {
  const header = Object.entries(map).find(([, v]) => v === field)?.[0];
  if (!header) return null;
  const val = (row[header] ?? "").trim();
  return val ? normalizeAmount(val) : null;
}

export function normalizeRow(
  rawRow: Record<string, string>,
  index: number,
  columnMap: Record<string, MappedField>
): NormalizedContactRow {
  const rawPhone = extractString(rawRow, columnMap, "phoneNumber");
  const rawName = extractString(rawRow, columnMap, "customerName");
  const rawDate = extractString(rawRow, columnMap, "dueDate");
  const rawStatus = extractString(rawRow, columnMap, "status");
  const rawNotes = extractString(rawRow, columnMap, "notes");

  return {
    rowIndex: index,
    customerName: rawName,
    phoneNumber: rawPhone ? normalizePhone(rawPhone) : "",
    totalAmount: extractNumber(rawRow, columnMap, "totalAmount"),
    paidAmount: extractNumber(rawRow, columnMap, "paidAmount"),
    dueAmount: extractNumber(rawRow, columnMap, "dueAmount"),
    dueDate: rawDate ? normalizeDate(rawDate) : null,
    status: rawStatus || null,
    notes: rawNotes || null,
  };
}

export function normalizeRows(
  rawRows: Record<string, string>[],
  columns: DetectedColumn[]
): NormalizedContactRow[] {
  const columnMap = buildColumnMap(columns);
  return rawRows.map((rawRow, index) => normalizeRow(rawRow, index, columnMap));
}
