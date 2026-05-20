import type { FollowupAttempt } from "@/features/messages/types";

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
  sla_due_at?: string | null;
  escalation_level?: number;
  promise_due_at?: string | null;
  last_promise_broken_at?: string | null;
  recovery_score?: number | null;
  risk_level?: string | null;
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

export type LifecycleStatus = CandidateStatus;

export interface CandidateWithContact extends FollowupCandidate {
  contact: Contact;
}

export interface OperationalQueueItem {
  candidate: FollowupCandidate;
  contact: Contact;
  lastAttempt?: FollowupAttempt;
}

export interface OperationalQueue {
  highPriority: OperationalQueueItem[];
  mediumPriority: OperationalQueueItem[];
  lowPriority: OperationalQueueItem[];
}
