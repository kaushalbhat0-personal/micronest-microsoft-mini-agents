import type { BaseEntity } from "@/shared/types";
import type { FollowupStatus } from "@/shared/utils/constants";

export interface FollowUp extends BaseEntity {
  upload_id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  amount_due: number | null;
  due_date: string | null;
  notes: string | null;
  status: FollowupStatus;
  ai_draft: string | null;
  draft_generated_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  whatsapp_link: string | null;
}

export interface FollowUpDraft {
  id: string;
  customer_name: string;
  phone: string;
  amount_due: number | null;
  due_date: string | null;
  generated_draft: string;
  edited_draft: string;
  status: FollowupStatus;
}

export interface FollowUpStats {
  total: number;
  pending: number;
  drafted: number;
  sent: number;
  responded: number;
  closed: number;
}
