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
  | "runtime_disconnected";

export interface ContactEvent {
  id: string;
  user_id: string;
  contact_id: string;
  event_type: ContactEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const EVENT_LABELS: Record<ContactEventType, string> = {
  contact_imported: "Imported from upload",
  whatsapp_opened: "WhatsApp opened",
  followup_contacted: "Contacted customer",
  customer_responded: "Customer responded",
  payment_promised: "Payment promised",
  marked_resolved: "Marked resolved",
  followup_dismissed: "Follow-up dismissed",
  marked_ignored: "Marked ignored",
  followup_scheduled: "Follow-up scheduled",
  session_started: "Sequential session started",
  session_paused: "Session paused",
  session_resumed: "Session resumed",
  session_recovered: "Session recovered",
  send_verified: "Send verified",
  send_failed: "Send failed",
  retry_attempted: "Retry attempted",
  runtime_disconnected: "Runtime disconnected",
};

export const EVENT_ICONS: Record<ContactEventType, string> = {
  contact_imported: "upload",
  whatsapp_opened: "message-square",
  followup_contacted: "phone",
  customer_responded: "message-circle",
  payment_promised: "indian-rupee",
  marked_resolved: "check-circle",
  followup_dismissed: "x-circle",
  marked_ignored: "slash",
  followup_scheduled: "calendar",
  session_started: "play",
  session_paused: "pause",
  session_resumed: "rotate-ccw",
  session_recovered: "refresh-cw",
  send_verified: "check-circle",
  send_failed: "x-circle",
  retry_attempted: "refresh-cw",
  runtime_disconnected: "wifi-off",
};
