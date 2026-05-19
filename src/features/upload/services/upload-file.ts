import { FILE } from "@/shared/utils/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface StorageUploadResult {
  path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

export interface StorageUploadError {
  code: "INVALID_TYPE" | "FILE_TOO_LARGE" | "STORAGE_ERROR" | "EMPTY_FILE";
  message: string;
}

function validateFile(file: File): StorageUploadError | null {
  if (file.size === 0) {
    return { code: "EMPTY_FILE", message: "File is empty" };
  }

  if (file.size > FILE.MAX_SIZE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: `File exceeds ${FILE.MAX_SIZE_MB}MB limit`,
    };
  }

  const isAccepted = FILE.ACCEPTED_TYPES.includes(
    file.type as (typeof FILE.ACCEPTED_TYPES)[number]
  );
  if (!isAccepted) {
    return {
      code: "INVALID_TYPE",
      message: "File must be CSV or Excel (.xlsx, .xls)",
    };
  }

  return null;
}

function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${timestamp}_${safeName}`;
}

export async function uploadFileToStorage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  precomputedBuffer?: Buffer
): Promise<
  { data: StorageUploadResult; error: null } | { data: null; error: StorageUploadError }
> {
  const validationError = validateFile(file);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const storagePath = generateStoragePath(userId, file.name);
  const buffer = precomputedBuffer ?? Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return {
      data: null,
      error: {
        code: "STORAGE_ERROR",
        message: error.message,
      },
    };
  }

  return {
    data: {
      path: data.path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    },
    error: null,
  };
}
