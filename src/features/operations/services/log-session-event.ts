"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { createContactEvent } from "@/features/timeline/services/create-contact-event";
import type { ContactEventType } from "@/features/timeline/types";

export async function logSessionEvent(
  contactId: string,
  eventType: ContactEventType,
  metadata?: Record<string, unknown>,
  _workspaceId?: string | null
): Promise<void> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await createContactEvent(supabase, user.id, contactId, eventType, metadata ?? {});
  } catch {
    // Best effort
  }
}

export async function logSessionEventBatch(
  events: Array<{
    contactId: string;
    eventType: ContactEventType;
    metadata?: Record<string, unknown>;
  }>,
  _workspaceId?: string | null
): Promise<void> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const ev of events) {
      await createContactEvent(supabase, user.id, ev.contactId, ev.eventType, ev.metadata ?? {});
    }
  } catch {
    // Best effort
  }
}
