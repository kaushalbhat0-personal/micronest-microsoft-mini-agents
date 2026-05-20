"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { ContactLock } from "@/features/workspaces/types";

const LOCK_DURATION_SECONDS = 30;

export async function acquireLock(
  contactId: string,
  workspaceId: string
): Promise<{ success: boolean; lock?: ContactLock; error?: string }> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: existing } = await supabase
      .from("contact_locks")
      .select("*, locked_by:locked_by(id)")
      .eq("contact_id", contactId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing && existing.locked_by !== user.id) {
      return {
        success: false,
        error: "Contact is currently being handled by another operator",
      };
    }

    if (existing && existing.locked_by === user.id) {
      const { data: renewed } = await supabase
        .from("contact_locks")
        .update({
          expires_at: new Date(Date.now() + LOCK_DURATION_SECONDS * 1000).toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      return { success: true, lock: renewed as ContactLock };
    }

    const { data: lock, error } = await supabase
      .from("contact_locks")
      .insert({
        contact_id: contactId,
        locked_by: user.id,
        workspace_id: workspaceId,
        expires_at: new Date(Date.now() + LOCK_DURATION_SECONDS * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, lock: lock as ContactLock };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to acquire lock",
    };
  }
}

export async function releaseLock(contactId: string): Promise<void> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("contact_locks")
      .delete()
      .eq("contact_id", contactId)
      .eq("locked_by", user.id);
  } catch {
    // Best-effort cleanup
  }
}

export async function checkLock(contactId: string): Promise<ContactLock | null> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data } = await supabase
      .from("contact_locks")
      .select("*, locked_by:locked_by(id)")
      .eq("contact_id", contactId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!data) return null;

    const { data: userData } = await supabase
      .from("auth.users")
      .select("email")
      .eq("id", data.locked_by)
      .single();

    return {
      ...(data as unknown as ContactLock),
      locked_by_name: (userData as { email: string })?.email ?? "Unknown",
    };
  } catch {
    return null;
  }
}

export async function renewLock(contactId: string): Promise<boolean> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("contact_locks")
      .update({
        expires_at: new Date(Date.now() + LOCK_DURATION_SECONDS * 1000).toISOString(),
      })
      .eq("contact_id", contactId)
      .eq("locked_by", user.id);

    return !error;
  } catch {
    return false;
  }
}

export async function cleanupExpiredLocks(workspaceId: string): Promise<void> {
  try {
    const supabase = await createServerActionSupabaseClient();
    await supabase
      .from("contact_locks")
      .delete()
      .eq("workspace_id", workspaceId)
      .lt("expires_at", new Date().toISOString());
  } catch {
    // Best-effort cleanup
  }
}
