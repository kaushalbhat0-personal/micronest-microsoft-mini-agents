export type SequentialSessionState =
  | "queued"
  | "preparing"
  | "ready"
  | "sending"
  | "paused"
  | "completed"
  | "stopped"
  | "failed";

export interface SessionContact {
  candidateId: string;
  contactId: string;
  phoneNumber: string;
  customerName: string;
  message: string;
  state: "queued" | "skipped" | "sent" | "failed";
}

export interface SequentialSession {
  id: string;
  state: SequentialSessionState;
  contacts: SessionContact[];
  currentIndex: number;
  createdAt: string;
  delayMs: number;
  counters: {
    sent: number;
    skipped: number;
    failed: number;
  };
}
