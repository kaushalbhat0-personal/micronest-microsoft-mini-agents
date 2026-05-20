"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Workspace, WorkspaceMember } from "@/features/workspaces/types";

export async function getActiveWorkspace(): Promise<Workspace | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", membership.workspace_id)
      .single();

    if (workspace) return workspace as Workspace;
  }

  const { data: owned } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  return owned as Workspace | null;
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();
  return data as Workspace | null;
}

export async function getUserWorkspaces(): Promise<Workspace[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const ids = memberships?.map((m) => m.workspace_id) ?? [];

  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", ids);

  return (data as Workspace[]) ?? [];
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = await createServerSupabaseClient();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("*, user:user_id(email)")
    .eq("workspace_id", workspaceId);

  if (!memberships) return [];

  return (memberships as unknown as WorkspaceMember[]).map((m) => ({
    ...m,
    user_email: (m as unknown as { user: { email: string } }).user?.email ?? "",
  }));
}
