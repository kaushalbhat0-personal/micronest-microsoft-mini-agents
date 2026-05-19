import type { OperationalQueueItem, LifecycleStatus } from "@/features/followups/types";
import type { ContactEvent } from "@/features/timeline/types";

export interface QueueFilter {
  search: string;
  priority: string | null;
  status: string | null;
  overdue: boolean;
  scheduledToday: boolean;
}

export interface BulkActionResult {
  success: boolean;
  count: number;
  error?: string;
}

export interface QueueSortConfig {
  field: "priority" | "due_amount" | "overdue" | "last_contacted";
  direction: "asc" | "desc";
}

export interface ActivityEntry {
  id: string;
  type: "status_change" | "whatsapp_sent" | "followup_scheduled" | "bulk_action";
  contactName: string;
  description: string;
  timestamp: string;
}

export interface ActiveSelection {
  index: number;
  item: OperationalQueueItem;
}

export { type OperationalQueueItem, type LifecycleStatus, type ContactEvent };
