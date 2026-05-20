// Extension-side types mirroring web app data shapes

export interface Contact {
  id: string;
  user_id: string;
  upload_id: string | null;
  customer_name: string;
  phone_number: string;
  total_amount: number | null;
  paid_amount: number | null;
  due_amount: number | null;
  due_date: string | null;
  workflow_status: WorkflowStatus;
  next_followup_at: string | null;
  raw_data: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export type WorkflowStatus =
  | "active"
  | "opened"
  | "contacted"
  | "responded"
  | "promised"
  | "resolved"
  | "ignored";

export interface FollowupCandidate {
  id: string;
  user_id: string;
  contact_id: string;
  priority: CandidatePriority;
  reason: string;
  candidate_status: CandidateStatus;
  generated_at: string;
}

export type CandidatePriority = "low" | "medium" | "high";

export type CandidateStatus =
  | "pending"
  | "opened"
  | "contacted"
  | "responded"
  | "promised"
  | "resolved"
  | "dismissed"
  | "ignored";

export interface FollowupAttempt {
  id: string;
  user_id: string;
  candidate_id: string;
  contact_id: string;
  channel: "whatsapp";
  message: string;
  attempt_status: "opened" | "sent" | "failed";
  created_at: string;
}

export interface OperationalQueueItem {
  candidate: FollowupCandidate;
  contact: Contact;
  lastAttempt?: FollowupAttempt;
}

export type ContactEventType =
  | "contact_imported"
  | "whatsapp_opened"
  | "followup_contacted"
  | "customer_responded"
  | "payment_promised"
  | "marked_resolved"
  | "followup_dismissed"
  | "marked_ignored"
  | "followup_scheduled"
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "session_recovered"
  | "send_verified"
  | "send_failed"
  | "retry_attempted"
  | "runtime_disconnected"
  | "note_added";

export interface ContactEvent {
  id: string;
  user_id: string;
  contact_id: string;
  event_type: ContactEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ContactNote {
  id: string;
  user_id: string;
  contact_id: string;
  note: string;
  created_at: string;
}

export interface SequentialSessionInfo {
  id: string;
  state: string;
  currentIndex: number;
  totalCount: number;
  currentContactName: string;
  counters: {
    sent: number;
    skipped: number;
    failed: number;
  };
  failedCount: number;
  delayRemainingMs: number;
}

export interface RecoveryStatus {
  hasRecoveredSession: boolean;
  session: SequentialSessionInfo | null;
  whatsappConnected: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "admin" | "operator" | "viewer";
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

export interface OperatorMetrics {
  assignedContacts: number;
  activeFollowups: number;
  overduePromises: number;
  resolvedToday: number;
  activeSessions: number;
}
