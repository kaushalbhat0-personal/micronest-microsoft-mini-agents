"use server";

import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import { redirect } from "next/navigation";

export interface CreateWorkspaceResult {
  success: boolean;
  workspaceId?: string;
  error?: string;
}

export async function createWorkspace(name: string): Promise<CreateWorkspaceResult> {
  try {
    const supabase = await createServerActionSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: user.id, role: "admin" });

    return { success: true, workspaceId: workspace.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create workspace",
    };
  }
}

export async function createWorkspaceAndRedirect(name: string): Promise<void> {
  const result = await createWorkspace(name);
  if (result.success && result.workspaceId) {
    redirect("/");
  }
}
