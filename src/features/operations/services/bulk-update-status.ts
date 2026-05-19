"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { createContactEvent } from "@/features/timeline/services/create-contact-event";
import { canTransition, getEventTypeForTransition } from "@/features/followups/services/state-machine";
import type { LifecycleStatus } from "@/features/followups/types";
import type { ContactEventType } from "@/features/timeline/types";
import type { BulkActionResult } from "@/features/operations/types";

export async function bulkUpdateStatus(
  updates: { candidateId: string; contactId: string }[],
  newStatus: LifecycleStatus
): Promise<BulkActionResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, count: 0, error: "Unauthorized" };
    }

    const { data: candidates } = await supabase
      .from("followup_candidates")
      .select("id, candidate_status")
      .in("id", updates.map((u) => u.candidateId))
      .eq("user_id", user.id);

    if (!candidates) {
      return { success: false, count: 0, error: "No candidates found" };
    }

    const statusMap = new Map(candidates.map((c) => [c.id, c.candidate_status]));
    const validIds = updates.filter((u) => {
      const currentStatus = statusMap.get(u.candidateId) as LifecycleStatus;
      return currentStatus && canTransition(currentStatus, newStatus);
    });

    if (validIds.length === 0) {
      return { success: false, count: 0, error: "No valid transitions available" };
    }

    const { error: updateError } = await supabase
      .from("followup_candidates")
      .update({ candidate_status: newStatus })
      .in("id", validIds.map((u) => u.candidateId))
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, count: 0, error: updateError.message };
    }

    if (newStatus === "resolved" || newStatus === "ignored") {
      const contactStatus = newStatus === "resolved" ? "resolved" : "ignored";
      await supabase
        .from("contacts")
        .update({ workflow_status: contactStatus, updated_at: new Date().toISOString() })
        .in("id", validIds.map((u) => u.contactId))
        .eq("user_id", user.id);
    }

    for (const update of validIds) {
      const currentStatus = statusMap.get(update.candidateId) as LifecycleStatus;
      const eventType = getEventTypeForTransition(currentStatus, newStatus);
      if (eventType) {
        await createContactEvent(supabase, user.id, update.contactId, eventType as ContactEventType, {
          previous_status: currentStatus,
          new_status: newStatus,
          bulk_action: true,
        });
      }
    }

    return { success: true, count: validIds.length };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to bulk update",
    };
  }
}
