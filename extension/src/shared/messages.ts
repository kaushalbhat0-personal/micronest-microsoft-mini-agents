export type SequentialSessionState =
  | "queued"
  | "preparing"
  | "ready"
  | "sending"
  | "paused"
  | "completed"
  | "stopped"
  | "failed";

export interface SessionContactPayload {
  candidateId: string;
  contactId: string;
  phoneNumber: string;
  customerName: string;
  message: string;
}

export interface StartSequencePayload {
  sessionId: string;
  contacts: SessionContactPayload[];
}

export interface SequenceStatusPayload {
  sessionId: string;
  state: SequentialSessionState;
  currentIndex: number;
  totalCount: number;
  delayRemainingMs: number;
  currentContactName: string;
  counters: {
    sent: number;
    skipped: number;
    failed: number;
  };
}

export interface EditMessagePayload {
  sessionId: string;
  index: number;
  message: string;
}

export type WebAppMessage =
  | { type: "START_SEQUENCE"; payload: StartSequencePayload }
  | { type: "PAUSE_SEQUENCE"; payload: { sessionId: string } }
  | { type: "RESUME_SEQUENCE"; payload: { sessionId: string } }
  | { type: "STOP_SEQUENCE"; payload: { sessionId: string } }
  | { type: "SKIP_CURRENT"; payload: { sessionId: string } }
  | { type: "EDIT_MESSAGE"; payload: EditMessagePayload }
  | { type: "SEQUENCE_SEND_RESULT"; payload: { sessionId: string; index: number; success: boolean; error?: string } };

export type ExtensionMessage =
  | { type: "SEQUENCE_STATUS"; payload: SequenceStatusPayload }
  | { type: "SEQUENCE_COMPLETED"; payload: { sessionId: string } }
  | { type: "SEQUENCE_FAILED"; payload: { sessionId: string; error: string } }
  | { type: "INJECT_MESSAGE"; payload: { message: string; phoneNumber: string } }
  | { type: "INJECT_RESULT"; payload: { success: boolean; error?: string } }
  | { type: "WHATSAPP_READY"; payload: { ready: boolean } }
  | { type: "GET_WHATSAPP_TAB" }
  | { type: "OPEN_WHATSAPP" };

export const SEQUENCE_POST_MESSAGE_TYPE = "MICRONEST_SEQUENCE";
