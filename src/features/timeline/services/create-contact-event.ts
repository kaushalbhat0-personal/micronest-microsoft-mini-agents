import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactEventType } from "@/features/timeline/types";

export async function createContactEvent(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  eventType: ContactEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("contact_events").insert({
    user_id: userId,
    contact_id: contactId,
    event_type: eventType,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Failed to create contact event:", error.message);
  }
}
