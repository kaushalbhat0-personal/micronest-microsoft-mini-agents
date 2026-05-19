import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContactEvent } from "@/features/timeline/types";

export async function getContactTimeline(
  contactId: string
): Promise<ContactEvent[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("contact_events")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as unknown as ContactEvent[];
}
