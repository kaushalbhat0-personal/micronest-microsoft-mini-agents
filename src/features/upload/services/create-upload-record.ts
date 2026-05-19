import type { SupabaseClient } from "@supabase/supabase-js";

export interface UploadRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  upload_status: "uploaded" | "processing" | "completed" | "failed";
  created_at: string;
}

export async function createUploadRecord(
  supabase: SupabaseClient,
  params: {
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
  }
): Promise<{ data: UploadRecord | null; error: string | null }> {
  const { data, error } = await supabase
    .from("uploads")
    .insert({
      user_id: params.userId,
      file_name: params.fileName,
      file_size: params.fileSize,
      mime_type: params.mimeType,
      storage_path: params.storagePath,
      upload_status: "uploaded",
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UploadRecord, error: null };
}
