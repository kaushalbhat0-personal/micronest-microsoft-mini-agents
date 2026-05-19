import type { Contact, FollowupCandidate } from "@/features/followups/types";
import { calculatePriority } from "./calculate-priority";

export interface CandidateInput {
  contact_id: string;
  priority: FollowupCandidate["priority"];
  reason: string;
}

export function detectFollowupCandidates(contacts: Contact[]): CandidateInput[] {
  const candidates: CandidateInput[] = [];

  for (const contact of contacts) {
    const { priority, reason } = calculatePriority(contact);
    if (!priority) continue;

    candidates.push({
      contact_id: contact.id,
      priority,
      reason,
    });
  }

  return candidates;
}
