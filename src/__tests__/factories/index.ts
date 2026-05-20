import type { FollowupCandidate, Contact, CandidateWithContact, OperationalQueueItem } from "@/features/followups/types";
import type { LifecycleStatus, CandidatePriority, CandidateStatus, WorkflowStatus } from "@/features/followups/types";
import type { PersistedSession } from "@extension/shared/storage";

let _idCounter = 0;
export function uid(): string {
  _idCounter++;
  return `test-id-${_idCounter}`;
}

export function buildContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: uid(),
    user_id: uid(),
    upload_id: null,
    customer_name: "Test Customer",
    phone_number: "12025550199",
    total_amount: 1000,
    paid_amount: 500,
    due_amount: 500,
    due_date: "2026-06-15",
    workflow_status: "active",
    next_followup_at: null,
    raw_data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildFollowupCandidate(overrides: Partial<FollowupCandidate> = {}): FollowupCandidate {
  return {
    id: uid(),
    user_id: uid(),
    contact_id: uid(),
    priority: "medium" as CandidatePriority,
    reason: "Test followup reason",
    candidate_status: "pending" as CandidateStatus,
    generated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildCandidateWithContact(overrides: Partial<CandidateWithContact> = {}): CandidateWithContact {
  const contact = buildContact();
  return {
    id: uid(),
    user_id: contact.user_id,
    contact_id: contact.id,
    priority: "medium",
    reason: "Test followup reason",
    candidate_status: "pending",
    generated_at: new Date().toISOString(),
    contact,
    ...overrides,
  };
}

export function buildOperationalQueueItem(overrides: Partial<OperationalQueueItem> = {}): OperationalQueueItem {
  const candidate = buildFollowupCandidate();
  const contact = buildContact({ id: candidate.contact_id, user_id: candidate.user_id });
  return {
    candidate,
    contact,
    lastAttempt: undefined,
    ...overrides,
  };
}

export function buildPersistedSession(overrides: Partial<PersistedSession> = {}): PersistedSession {
  return {
    id: uid(),
    contacts: [
      {
        candidateId: uid(),
        contactId: uid(),
        phoneNumber: "12025550199",
        customerName: "Alice",
        message: "Hello Alice, this is a test message.",
      },
      {
        candidateId: uid(),
        contactId: uid(),
        phoneNumber: "12025550200",
        customerName: "Bob",
        message: "Hello Bob, this is a test message.",
      },
    ],
    currentIndex: 0,
    state: "sending",
    counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    failedContacts: [],
    heartbeatTimestamps: [Date.now()],
    ...overrides,
  };
}

export function buildFailedContact(overrides: Partial<PersistedSession["failedContacts"][0]> = {}): PersistedSession["failedContacts"][0] {
  return {
    index: 0,
    category: "DOM_NOT_FOUND",
    message: "Element not found",
    retryable: true,
    candidateId: uid(),
    contactId: uid(),
    ...overrides,
  };
}
