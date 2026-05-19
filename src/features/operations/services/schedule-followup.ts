"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { createContactEvent } from "@/features/timeline/services/create-contact-event";

export interface ScheduleResult {
  success: boolean;
  error?: string;
}

export async function scheduleFollowup(
  contactId: string,
  scheduledAt: string
): Promise<ScheduleResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error: updateError } = await supabase
      .from("contacts")
      .update({ next_followup_at: scheduledAt, updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await createContactEvent(supabase, user.id, contactId, "followup_scheduled", {
      scheduled_at: scheduledAt,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to schedule follow-up",
    };
  }
}
