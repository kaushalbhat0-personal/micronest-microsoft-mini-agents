import { type NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/shared/types/api";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { uploadFileToStorage } from "@/features/upload/services/upload-file";
import { createUploadRecord } from "@/features/upload/services/create-upload-record";
import { parseSheet } from "@/features/upload/services/parse-sheet";
import { buildPreviewFromParsed } from "@/features/upload/services/build-preview";

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createRouteHandlerSupabaseClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("No file provided", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storageResult = await uploadFileToStorage(supabase, user.id, file, buffer);
    if (storageResult.error) {
      const status =
        storageResult.error.code === "INVALID_TYPE" ||
        storageResult.error.code === "FILE_TOO_LARGE" ||
        storageResult.error.code === "EMPTY_FILE"
          ? 400
          : 500;
      return apiError(storageResult.error.message, status);
    }

    const recordResult = await createUploadRecord(supabase, {
      userId: user.id,
      fileName: storageResult.data.file_name,
      fileSize: storageResult.data.file_size,
      mimeType: storageResult.data.mime_type,
      storagePath: storageResult.data.path,
    });

    if (recordResult.error) {
      await supabase.storage.from("uploads").remove([storageResult.data.path]);
      return apiError(recordResult.error, 500);
    }

    const parseResult = parseSheet(buffer, file.name);
    if (!parseResult.data) {
      return apiSuccess({
        upload: recordResult.data,
        parsedSheet: null,
        preview: null,
        parseError: parseResult.error,
      });
    }

    const { preview } = buildPreviewFromParsed(parseResult.data);

    return apiSuccess({
      upload: recordResult.data,
      parsedSheet: parseResult.data,
      preview,
      parseError: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process upload";
    return apiError(message, 500);
  }
}
