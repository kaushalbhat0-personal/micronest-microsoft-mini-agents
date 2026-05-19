"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { createContactEvent } from "@/features/timeline/services/create-contact-event";

export interface CreateAttemptResult {
  success: boolean;
  attemptId?: string;
  error?: string;
}

export async function createFollowupAttempt(
  candidateId: string,
  contactId: string,
  message: string
): Promise<CreateAttemptResult> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("followup_attempts")
      .insert({
        user_id: user.id,
        candidate_id: candidateId,
        contact_id: contactId,
        channel: "whatsapp",
        message,
        attempt_status: "opened",
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase
      .from("followup_candidates")
      .update({ candidate_status: "opened" })
      .eq("id", candidateId)
      .eq("user_id", user.id);

    await createContactEvent(supabase, user.id, contactId, "whatsapp_opened", {
      attempt_id: data?.id,
      message_preview: message.slice(0, 100),
    });

    return { success: true, attemptId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create attempt",
    };
  }
}
