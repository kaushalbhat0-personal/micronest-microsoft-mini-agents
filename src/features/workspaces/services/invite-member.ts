"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import type { WorkspaceRole } from "@/features/workspaces/types";

export async function inviteMember(
  workspaceId: string,
  userEmail: string,
  role: WorkspaceRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: targetUser } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (!targetUser) return { success: false, error: "User not found" };

    const { error } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: targetUser.id, role });

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to invite member",
    };
  }
}

export async function removeMember(
  workspaceId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove member",
    };
  }
}

export async function updateMemberRole(
  memberId: string,
  role: WorkspaceRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { error } = await supabase
      .from("workspace_members")
      .update({ role })
      .eq("id", memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update role",
    };
  }
}

export async function renameWorkspace(
  workspaceId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionSupabaseClient();

    const { error } = await supabase
      .from("workspaces")
      .update({ name })
      .eq("id", workspaceId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to rename workspace",
    };
  }
}
