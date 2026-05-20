"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";

export interface OperatorMetrics {
  assignedContacts: number;
  activeFollowups: number;
  overduePromises: number;
  resolvedToday: number;
  activeSessions: number;
}

export async function getOperatorMetrics(
  workspaceId: string
): Promise<OperatorMetrics> {
  const supabase = await createServerActionSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const metrics: OperatorMetrics = {
    assignedContacts: 0,
    activeFollowups: 0,
    overduePromises: 0,
    resolvedToday: 0,
    activeSessions: 0,
  };

  if (!user) return metrics;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [assignedResult, followupsResult, promisesResult, resolvedResult, sessionsResult] =
    await Promise.all([
      supabase
        .from("followup_candidates")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("assigned_to", user.id),

      supabase
        .from("followup_candidates")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("assigned_to", user.id)
        .in("candidate_status", ["pending", "opened", "contacted", "responded"]),

      supabase
        .from("followup_candidates")
        .select("id, contact:contact_id(due_date)", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("assigned_to", user.id)
        .eq("candidate_status", "promised")
        .lt("contact.due_date", new Date().toISOString()),

      supabase
        .from("contact_events")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .eq("event_type", "marked_resolved")
        .gte("created_at", todayStart.toISOString()),

      supabase
        .from("sequential_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .in("state", ["sending", "paused"]),
    ]);

  metrics.assignedContacts = assignedResult.count ?? 0;
  metrics.activeFollowups = followupsResult.count ?? 0;
  metrics.overduePromises = promisesResult.count ?? 0;
  metrics.resolvedToday = resolvedResult.count ?? 0;
  metrics.activeSessions = sessionsResult.count ?? 0;

  return metrics;
}
