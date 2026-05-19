export type FileType = "csv" | "xlsx" | "xls";

export type UploadStatus = "uploaded" | "processing" | "completed" | "failed";

export interface UploadRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  upload_status: UploadStatus;
  created_at: string;
}
