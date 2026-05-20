"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";

export interface AssignContactResult {
  success: boolean;
  error?: string;
}

export async function assignContact(
  candidateId: string,
  contactId: string,
  assigneeId: string | null
): Promise<AssignContactResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error: candidateErr } = await supabase
      .from("followup_candidates")
      .update({ assigned_to: assigneeId })
      .eq("id", candidateId)
      .eq("user_id", user.id);

    if (candidateErr) return { success: false, error: candidateErr.message };

    const { error: contactErr } = await supabase
      .from("contacts")
      .update({ assigned_to: assigneeId, updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", user.id);

    if (contactErr) return { success: false, error: contactErr.message };

    await supabase.from("contact_events").insert({
      user_id: user.id,
      contact_id: contactId,
      event_type: "followup_scheduled",
      metadata: {
        action: assigneeId ? "assigned" : "unassigned",
        assignee_id: assigneeId,
        actor_id: user.id,
      },
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign contact",
    };
  }
}

export async function selfAssignContact(
  candidateId: string,
  contactId: string
): Promise<AssignContactResult> {
  const supabase = await createServerActionSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  return assignContact(candidateId, contactId, user.id);
}

export async function bulkAssignContacts(
  assignments: Array<{ candidateId: string; contactId: string }>,
  assigneeId: string | null
): Promise<AssignContactResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const candidateIds = assignments.map((a) => a.candidateId);

    const { error: candidateErr } = await supabase
      .from("followup_candidates")
      .update({ assigned_to: assigneeId })
      .in("id", candidateIds)
      .eq("user_id", user.id);

    if (candidateErr) return { success: false, error: candidateErr.message };

    const contactIds = assignments.map((a) => a.contactId);

    const { error: contactErr } = await supabase
      .from("contacts")
      .update({ assigned_to: assigneeId, updated_at: new Date().toISOString() })
      .in("id", contactIds)
      .eq("user_id", user.id);

    if (contactErr) return { success: false, error: contactErr.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to bulk assign",
    };
  }
}
