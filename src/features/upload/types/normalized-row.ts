export interface NormalizedContactRow {
  rowIndex: number;
  customerName: string;
  phoneNumber: string;
  totalAmount: number | null;
  paidAmount: number | null;
  dueAmount: number | null;
  dueDate: string | null;
  status: string | null;
  notes: string | null;
}

export type MappedField = Exclude<keyof NormalizedContactRow, "rowIndex">;

export type ColumnDropOption = MappedField | "ignore";

export const ALL_FIELDS: MappedField[] = [
  "customerName",
  "phoneNumber",
  "totalAmount",
  "paidAmount",
  "dueAmount",
  "dueDate",
  "status",
  "notes",
];

export function isMappedField(value: string): value is MappedField {
  return ALL_FIELDS.includes(value as MappedField);
}

export interface ValidationResult {
  row: NormalizedContactRow;
  errors: string[];
  warnings: string[];
}

export interface DetectedColumn {
  header: string;
  mappedField: MappedField | null;
  confidence: "high" | "medium" | "low" | null;
}

export interface PreviewSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  withPhone: number;
  withTotalAmount: number;
  withPaidAmount: number;
  withDueAmount: number;
  withDueDate: number;
  unmappedColumns: number;
  mappingConfidence: number;
}

export interface PreviewResult {
  rows: ValidationResult[];
  columns: DetectedColumn[];
  summary: PreviewSummary;
}
