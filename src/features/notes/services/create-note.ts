"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";

export interface CreateNoteResult {
  success: boolean;
  error?: string;
}

export async function createNote(
  contactId: string,
  note: string
): Promise<CreateNoteResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("contact_notes")
      .insert({ user_id: user.id, contact_id: contactId, note });

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create note",
    };
  }
}
