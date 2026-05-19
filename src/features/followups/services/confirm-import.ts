"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { parseSheet } from "@/features/upload/services/parse-sheet";
import { normalizeRows } from "@/features/upload/services/normalize-rows";
import { validateRows } from "@/features/upload/services/validate-rows";
import { createContacts } from "./create-contacts";
import { detectFollowupCandidates } from "./detect-followup-candidates";
import type { DetectedColumn } from "@/features/upload/types/normalized-row";

export interface ConfirmImportResult {
  success: boolean;
  contactsCreated: number;
  candidatesGenerated: number;
  error?: string;
}

export async function confirmImport(
  uploadId: string,
  columns: DetectedColumn[]
): Promise<ConfirmImportResult> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, contactsCreated: 0, candidatesGenerated: 0, error: "Unauthorized" };
    }

    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .select("storage_path, file_name")
      .eq("id", uploadId)
      .eq("user_id", user.id)
      .single();

    if (uploadError || !upload) {
      return { success: false, contactsCreated: 0, candidatesGenerated: 0, error: "Upload not found" };
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("uploads")
      .download(upload.storage_path);

    if (downloadError || !fileData) {
      return { success: false, contactsCreated: 0, candidatesGenerated: 0, error: "Failed to read uploaded file" };
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const parseResult = parseSheet(buffer, upload.file_name);

    if (!parseResult.data) {
      return { success: false, contactsCreated: 0, candidatesGenerated: 0, error: "Failed to parse file" };
    }

    const normalized = normalizeRows(parseResult.data.rawRows, columns);
    const validated = validateRows(normalized);
    const rawRows = parseResult.data.rawRows;

    const validRows = validated
      .map((vr, i) => ({ normalized: vr.row, raw: rawRows[i] ?? {} }))
      .filter((vr) => {
        const validation = validated.find((v) => v.row.rowIndex === vr.normalized.rowIndex);
        return validation && validation.errors.length === 0;
      });

    if (validRows.length === 0) {
      return { success: false, contactsCreated: 0, candidatesGenerated: 0, error: "No valid rows to import" };
    }

    const contacts = await createContacts(supabase, user.id, uploadId, validRows);

    const candidates = detectFollowupCandidates(contacts);

    if (candidates.length > 0) {
      const candidateRows = candidates.map((c) => ({
        user_id: user.id,
        contact_id: c.contact_id,
        priority: c.priority,
        reason: c.reason,
      }));

      const { error: insertError } = await supabase
        .from("followup_candidates")
        .insert(candidateRows);

      if (insertError) {
        return { success: false, contactsCreated: 0, candidatesGenerated: 0, error: insertError.message };
      }
    }

    await supabase
      .from("uploads")
      .update({ upload_status: "completed" })
      .eq("id", uploadId);

    return {
      success: true,
      contactsCreated: contacts.length,
      candidatesGenerated: candidates.length,
    };
  } catch (err) {
    return {
      success: false,
      contactsCreated: 0,
      candidatesGenerated: 0,
      error: err instanceof Error ? err.message : "Import failed",
    };
  }
}
