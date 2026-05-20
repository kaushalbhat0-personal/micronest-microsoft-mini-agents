"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { ContactNote } from "@/features/notes/types";

export async function getNotes(contactId: string, workspaceId?: string | null): Promise<ContactNote[]> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return data as unknown as ContactNote[];
  } catch {
    return [];
  }
}
