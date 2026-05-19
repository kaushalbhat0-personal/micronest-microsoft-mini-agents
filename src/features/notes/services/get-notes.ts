"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { ContactNote } from "@/features/notes/types";

export async function getNotes(contactId: string): Promise<ContactNote[]> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as unknown as ContactNote[];
  } catch {
    return [];
  }
}
