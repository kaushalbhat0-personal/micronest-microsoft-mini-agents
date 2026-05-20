"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/features/workspaces/types";

export async function getUserRole(workspaceId: string): Promise<WorkspaceRole | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data?.role as WorkspaceRole) ?? null;
}

export async function requireRole(workspaceId: string, allowedRoles: WorkspaceRole[]): Promise<boolean> {
  const role = await getUserRole(workspaceId);
  if (!role || !allowedRoles.includes(role)) return false;
  return true;
}
