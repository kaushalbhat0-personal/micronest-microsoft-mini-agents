"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";

export interface QueueMetrics {
  activeCount: number;
  overdueCount: number;
  promisedToday: number;
  contactedToday: number;
  totalOutstanding: number;
}

export async function getQueueMetrics(): Promise<QueueMetrics> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { activeCount: 0, overdueCount: 0, promisedToday: 0, contactedToday: 0, totalOutstanding: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { data: candidates } = await supabase
      .from("followup_candidates")
      .select("id, candidate_status, contact:contact_id(due_amount, due_date)")
      .eq("user_id", user.id)
      .in("candidate_status", ["pending", "opened", "contacted", "responded", "promised"]);

    if (!candidates) {
      return { activeCount: 0, overdueCount: 0, promisedToday: 0, contactedToday: 0, totalOutstanding: 0 };
    }

    let overdueCount = 0;
    let totalOutstanding = 0;
    let promisedToday = 0;
    let contactedToday = 0;

    for (const c of candidates) {
      const contact = c.contact as unknown as { due_amount?: unknown; due_date?: string } | undefined;
      if (contact?.due_amount !== null && contact?.due_amount !== undefined) {
        totalOutstanding += Number(contact.due_amount);
      }
      if (
        contact?.due_date &&
        new Date(contact.due_date) < today
      ) {
        overdueCount++;
      }
    }

    const todayEnd = new Date(todayStr);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const todayEndStr = todayEnd.toISOString();

    const { data: todayPromised } = await supabase
      .from("contact_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "payment_promised")
      .gte("created_at", todayStr)
      .lt("created_at", todayEndStr);

    promisedToday = todayPromised?.length ?? 0;

    const { data: todayContacted } = await supabase
      .from("contact_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "followup_contacted")
      .gte("created_at", todayStr)
      .lt("created_at", todayEndStr);

    contactedToday = todayContacted?.length ?? 0;

    return {
      activeCount: candidates.length,
      overdueCount,
      promisedToday,
      contactedToday,
      totalOutstanding,
    };
  } catch {
    return { activeCount: 0, overdueCount: 0, promisedToday: 0, contactedToday: 0, totalOutstanding: 0 };
  }
}
