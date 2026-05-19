"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { createContactEvent } from "@/features/timeline/services/create-contact-event";
import type { BulkActionResult } from "@/features/operations/types";

export async function bulkScheduleFollowup(
  updates: { candidateId: string; contactId: string }[],
  scheduledAt: string
): Promise<BulkActionResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, count: 0, error: "Unauthorized" };
    }

    const { error: contactError } = await supabase
      .from("contacts")
      .update({ next_followup_at: scheduledAt, updated_at: new Date().toISOString() })
      .in("id", updates.map((u) => u.contactId))
      .eq("user_id", user.id);

    if (contactError) {
      return { success: false, count: 0, error: contactError.message };
    }

    for (const update of updates) {
      await createContactEvent(supabase, user.id, update.contactId, "followup_scheduled", {
        scheduled_at: scheduledAt,
        bulk_action: true,
      });
    }

    return { success: true, count: updates.length };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to bulk schedule",
    };
  }
}
