"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { WorkflowStatus } from "@/features/followups/types";

export interface UpdateContactStatusResult {
  success: boolean;
  error?: string;
}

export async function updateContactStatus(
  contactId: string,
  status: WorkflowStatus
): Promise<UpdateContactStatusResult> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error: updateError } = await supabase
      .from("contacts")
      .update({ workflow_status: status, updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update contact status",
    };
  }
}
