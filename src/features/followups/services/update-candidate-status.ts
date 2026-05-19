"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { CandidateStatus } from "@/features/followups/types";

export interface UpdateStatusResult {
  success: boolean;
  error?: string;
}

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus
): Promise<UpdateStatusResult> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("followup_candidates")
      .update({ candidate_status: status })
      .eq("id", candidateId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update status",
    };
  }
}
