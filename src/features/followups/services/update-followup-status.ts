"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { createContactEvent } from "@/features/timeline/services/create-contact-event";
import { logActivity } from "@/features/workspaces/services/workspace-activity";
import { canTransition, getEventTypeForTransition } from "./state-machine";
import type { LifecycleStatus } from "@/features/followups/types";
import type { ContactEventType } from "@/features/timeline/types";

export interface UpdateFollowupStatusResult {
  success: boolean;
  error?: string;
}

export async function updateFollowupStatus(
  candidateId: string,
  contactId: string,
  newStatus: LifecycleStatus,
  workspaceId?: string | null
): Promise<UpdateFollowupStatusResult> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    let candidateQuery = supabase
      .from("followup_candidates")
      .select("candidate_status")
      .eq("id", candidateId)
      .eq("user_id", user.id);

    if (workspaceId) {
      candidateQuery = candidateQuery.eq("workspace_id", workspaceId);
    }

    const { data: candidate, error: fetchError } = await candidateQuery.single();

    if (fetchError || !candidate) {
      return { success: false, error: "Candidate not found" };
    }

    const currentStatus = candidate.candidate_status as LifecycleStatus;

    if (!canTransition(currentStatus, newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${currentStatus} to ${newStatus}`,
      };
    }

    const { error: updateError } = await supabase
      .from("followup_candidates")
      .update({ candidate_status: newStatus })
      .eq("id", candidateId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (newStatus === "resolved" || newStatus === "ignored") {
      const contactStatus = newStatus === "resolved" ? "resolved" : "ignored";
      await supabase
        .from("contacts")
        .update({ workflow_status: contactStatus, updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("user_id", user.id);
    }

    const eventType = getEventTypeForTransition(currentStatus, newStatus);
    if (eventType) {
      await createContactEvent(supabase, user.id, contactId, eventType as ContactEventType, {
        previous_status: currentStatus,
        new_status: newStatus,
      });
    }

    if (workspaceId) {
      await logActivity(workspaceId, "followup_status_change", {
        candidate_id: candidateId,
        contact_id: contactId,
        previous_status: currentStatus,
        new_status: newStatus,
      });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update status",
    };
  }
}
