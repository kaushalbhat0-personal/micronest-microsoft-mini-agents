"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { WorkspaceActivity } from "@/features/workspaces/types";

export async function logActivity(
  workspaceId: string,
  activityType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("workspace_activity").insert({
      workspace_id: workspaceId,
      actor_id: user.id,
      activity_type: activityType,
      metadata,
    });
  } catch {
    // Best-effort
  }
}

export async function getWorkspaceFeed(
  workspaceId: string,
  limit = 50
): Promise<WorkspaceActivity[]> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("workspace_activity")
      .select("*, actor:actor_id(email)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!data) return [];

    return (data as unknown as WorkspaceActivity[]).map((a) => ({
      ...a,
      actor_name: (a as unknown as { actor: { email: string } }).actor?.email ?? "Unknown",
    }));
  } catch {
    return [];
  }
}
