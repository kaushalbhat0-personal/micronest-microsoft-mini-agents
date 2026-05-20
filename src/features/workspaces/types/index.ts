export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export type WorkspaceRole = "admin" | "operator" | "viewer";

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  user_email?: string;
}

export interface ContactLock {
  id: string;
  contact_id: string;
  locked_by: string;
  workspace_id: string;
  acquired_at: string;
  expires_at: string;
  locked_by_name?: string;
}

export interface WorkspaceActivity {
  id: string;
  workspace_id: string;
  actor_id: string;
  activity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name?: string;
}
