"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { createContactEvent } from "@/features/timeline/services/create-contact-event";
import { buildFollowupMessage } from "@/features/messages/services/build-followup-message";

export interface CreateSequentialSessionInput {
  items: Array<{
    candidateId: string;
    contactId: string;
    phoneNumber: string;
    customerName: string;
  }>;
}

export interface CreateSequentialSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface MarkSessionContactResult {
  success: boolean;
  error?: string;
}

export async function createSequentialSession(
  input: CreateSequentialSessionInput,
  workspaceId?: string | null
): Promise<CreateSequentialSessionResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessionId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from("sequential_sessions")
      .insert({
        id: sessionId,
        user_id: user.id,
        state: "queued",
        total_contacts: input.items.length,
        created_at: new Date().toISOString(),
        counters: { sent: 0, skipped: 0, failed: 0 },
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    for (const item of input.items) {
      const message = buildFollowupMessage({
        id: item.contactId,
        user_id: user.id,
        upload_id: null,
        customer_name: item.customerName,
        phone_number: item.phoneNumber,
        total_amount: null,
        paid_amount: null,
        due_amount: null,
        due_date: null,
        workflow_status: "active",
        next_followup_at: null,
        raw_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { error: contactError } = await supabase
        .from("sequential_session_contacts")
        .insert({
          session_id: sessionId,
          candidate_id: item.candidateId,
          contact_id: item.contactId,
          phone_number: item.phoneNumber,
          customer_name: item.customerName,
          message,
          state: "queued",
        });

      if (contactError) {
        await supabase.from("sequential_sessions").delete().eq("id", sessionId);
        return { success: false, error: contactError.message };
      }
    }

    return { success: true, sessionId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create session",
    };
  }
}

export async function markSessionContactSent(
  sessionId: string,
  contactId: string,
  candidateId: string
): Promise<MarkSessionContactResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await supabase
      .from("sequential_session_contacts")
      .update({ state: "sent" })
      .eq("session_id", sessionId)
      .eq("contact_id", contactId);

    await createContactEvent(supabase, user.id, contactId, "whatsapp_opened", {
      session_id: sessionId,
      sequential: true,
    });

    await supabase
      .from("followup_candidates")
      .update({ candidate_status: "opened" })
      .eq("id", candidateId)
      .eq("user_id", user.id);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark contact sent",
    };
  }
}

export async function markSessionContactSkipped(
  sessionId: string,
  contactId: string
): Promise<MarkSessionContactResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await supabase
      .from("sequential_session_contacts")
      .update({ state: "skipped" })
      .eq("session_id", sessionId)
      .eq("contact_id", contactId);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark contact skipped",
    };
  }
}

export async function updateSequentialSessionState(
  sessionId: string,
  state: string
): Promise<void> {
  try {
    const supabase = await createServerActionSupabaseClient();
    await supabase
      .from("sequential_sessions")
      .update({ state })
      .eq("id", sessionId);
  } catch {
    // Best effort
  }
}

export async function getSequentialSessionContacts(
  sessionId: string
): Promise<Array<{ candidateId: string; contactId: string; message: string; phoneNumber: string; customerName: string }>> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data, error } = await supabase
      .from("sequential_session_contacts")
      .select("*")
      .eq("session_id", sessionId)
      .eq("state", "queued");

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((d) => ({
      candidateId: d.candidate_id as string,
      contactId: d.contact_id as string,
      message: d.message as string,
      phoneNumber: d.phone_number as string,
      customerName: d.customer_name as string,
    }));
  } catch {
    return [];
  }
}
