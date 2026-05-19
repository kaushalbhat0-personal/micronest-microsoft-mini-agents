export interface FollowupAttempt {
  id: string;
  user_id: string;
  candidate_id: string;
  contact_id: string;
  channel: AttemptChannel;
  message: string;
  attempt_status: AttemptStatus;
  created_at: string;
}

export type AttemptChannel = "whatsapp";

export type AttemptStatus = "opened" | "sent" | "failed";
