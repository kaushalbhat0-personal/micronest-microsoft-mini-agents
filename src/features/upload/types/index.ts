import type { BaseEntity } from "@/shared/types";

export type FileType = "csv" | "xlsx" | "xls";

export type UploadStatus = "pending" | "processing" | "completed" | "failed";

export interface UploadedFile extends BaseEntity {
  original_name: string;
  file_type: FileType;
  file_size: number;
  row_count: number;
  status: UploadStatus;
  error_message: string | null;
  columns: string[];
}

export interface ParsedRow {
  index: number;
  data: Record<string, string | number | null>;
  raw: unknown[];
}

export interface UploadResult {
  file: UploadedFile;
  rows: ParsedRow[];
  detected_columns: string[];
}
