"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { ActivityEntry } from "@/features/operations/types";

export async function getActivityFeed(): Promise<ActivityEntry[]> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: events, error } = await supabase
      .from("contact_events")
      .select("*, contact:contact_id(customer_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !events) return [];

    return events.map((ev: Record<string, unknown>) => {
      const contact = ev.contact as Record<string, unknown> | undefined;
      const contactName = (contact?.customer_name as string) || "Unknown";
      const metadata = ev.metadata as Record<string, unknown> | undefined;

      let description = "";
      switch (ev.event_type) {
        case "whatsapp_opened":
          description = "WhatsApp sent";
          break;
        case "followup_contacted":
          description = "Marked contacted";
          break;
        case "customer_responded":
          description = "Customer responded";
          break;
        case "payment_promised":
          description = "Payment promised";
          break;
        case "marked_resolved":
          description = "Marked resolved";
          break;
        case "followup_dismissed":
          description = "Follow-up dismissed";
          break;
        case "marked_ignored":
          description = "Marked ignored";
          break;
        case "followup_scheduled":
          description = "Follow-up scheduled";
          if (metadata?.scheduled_at) {
            description += ` for ${new Date(metadata.scheduled_at as string).toLocaleDateString("en-IN")}`;
          }
          break;
        default:
          description = (ev.event_type as string).replace(/_/g, " ");
      }

      const isBulk = metadata?.bulk_action === true;
      if (isBulk) {
        description += " (bulk)";
      }

      return {
        id: ev.id as string,
        type: ev.event_type === "whatsapp_opened" ? "whatsapp_sent" : "status_change",
        contactName,
        description,
        timestamp: ev.created_at as string,
      };
    });
  } catch {
    return [];
  }
}
