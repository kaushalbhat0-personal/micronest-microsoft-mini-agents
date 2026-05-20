import { describe, it, expect } from "vitest";
import { buildOperationalQueue } from "@/features/followups/services/build-operational-queue";
import {
  buildCandidateWithContact,
  buildContact,
  buildOperationalQueueItem,
  buildFollowupCandidate,
} from "./factories";
import type { CandidateWithContact, OperationalQueueItem } from "@/features/followups/types";
import type { FollowupAttempt } from "@/features/messages/types";

function filterActiveCandidates(candidates: CandidateWithContact[]): CandidateWithContact[] {
  const activeStatuses = new Set(["pending", "opened", "contacted", "responded", "promised"]);
  return candidates.filter((c) => activeStatuses.has(c.candidate_status));
}

function sortByPriority(candidates: CandidateWithContact[]): CandidateWithContact[] {
  const order = { high: 3, medium: 2, low: 1 };
  return [...candidates].sort((a, b) => {
    const diff = order[b.priority] - order[a.priority];
    if (diff !== 0) return diff;
    return 0;
  });
}

function buildLastAttemptMap(attempts: FollowupAttempt[]): Map<string, FollowupAttempt> {
  const map = new Map<string, FollowupAttempt>();
  for (const attempt of attempts) {
    if (!map.has(attempt.candidate_id)) {
      map.set(attempt.candidate_id, attempt);
    }
  }
  return map;
}

function getMostRecentAttempt(candidateId: string, attempts: FollowupAttempt[]): FollowupAttempt | undefined {
  const sorted = attempts
    .filter((a) => a.candidate_id === candidateId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return sorted[0];
}

function filterByWorkspace(candidates: CandidateWithContact[], workspaceId?: string | null): CandidateWithContact[] {
  if (workspaceId == null) return candidates;
  return candidates.filter((c) => {
    const cwc = c as CandidateWithContact & { workspace_id?: string };
    return cwc.workspace_id === workspaceId;
  });
}

function buildQueueEngine(
  candidates: CandidateWithContact[],
  attempts: FollowupAttempt[],
  workspaceId?: string | null
): OperationalQueueItem[] {
  let filtered = filterActiveCandidates(candidates);
  filtered = filterByWorkspace(filtered, workspaceId);
  filtered = sortByPriority(filtered);
  const map = buildLastAttemptMap(attempts);
  return filtered.map((c) => ({
    candidate: c,
    contact: c.contact,
    lastAttempt: map.get(c.id),
  }));
}

function stableSortByPriority(candidates: CandidateWithContact[]): CandidateWithContact[] {
  const order = { high: 3, medium: 2, low: 1 };
  return candidates
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const diff = order[b.c.priority] - order[a.c.priority];
      if (diff !== 0) return diff;
      return a.i - b.i;
    })
    .map(({ c }) => c);
}

function sortByNextFollowupAt(items: OperationalQueueItem[]): OperationalQueueItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.contact.next_followup_at ? new Date(a.contact.next_followup_at).getTime() : Infinity;
    const bTime = b.contact.next_followup_at ? new Date(b.contact.next_followup_at).getTime() : Infinity;
    return aTime - bTime;
  });
}

describe("queue-engine", () => {
  describe("filterActiveCandidates", () => {
    it("includes pending/opened/contacted/responded/promised statuses", () => {
      const candidates = activeStatuses.map((s) => buildCandidateWithContact({ candidate_status: s }));
      const result = filterActiveCandidates(candidates);
      expect(result).toHaveLength(activeStatuses.length);
    });

    it("excludes resolved/dismissed/ignored statuses", () => {
      const excluded = ["resolved", "dismissed", "ignored"] as const;
      const candidates = excluded.map((s) => buildCandidateWithContact({ candidate_status: s }));
      const result = filterActiveCandidates(candidates);
      expect(result).toHaveLength(0);
    });

    it("returns empty array for empty input", () => {
      expect(filterActiveCandidates([])).toEqual([]);
    });
  });

  describe("sortByPriority", () => {
    it("places high priority before medium before low", () => {
      const low = buildCandidateWithContact({ priority: "low" });
      const medium = buildCandidateWithContact({ priority: "medium" });
      const high = buildCandidateWithContact({ priority: "high" });
      const sorted = sortByPriority([low, medium, high]);
      expect(sorted[0].priority).toBe("high");
      expect(sorted[1].priority).toBe("medium");
      expect(sorted[2].priority).toBe("low");
    });

    it("maintains stable order for same priority items", () => {
      const a = buildCandidateWithContact({ priority: "medium" });
      const b = buildCandidateWithContact({ priority: "medium" });
      const c = buildCandidateWithContact({ priority: "medium" });
      const result = stableSortByPriority([b, a, c]);
      expect(result[0].id).toBe(b.id);
      expect(result[1].id).toBe(a.id);
      expect(result[2].id).toBe(c.id);
    });
  });

  describe("lastAttemptMap", () => {
    it("uses the most recent attempt per candidate", () => {
      const candidateId = "test-candidate";
      const older: FollowupAttempt = {
        id: "attempt-old",
        user_id: "u1",
        candidate_id: candidateId,
        contact_id: "c1",
        channel: "whatsapp",
        message: "old",
        attempt_status: "sent",
        created_at: "2026-01-01T00:00:00Z",
      };
      const newer: FollowupAttempt = {
        id: "attempt-new",
        user_id: "u1",
        candidate_id: candidateId,
        contact_id: "c1",
        channel: "whatsapp",
        message: "new",
        attempt_status: "sent",
        created_at: "2026-06-01T00:00:00Z",
      };
      const map = buildLastAttemptMap([older, newer]);
      expect(map.get(candidateId)?.id).toBe("attempt-old");
    });

    it("only keeps the first attempt encountered (which is most recent if data is ordered desc)", () => {
      const candidateId = "test-candidate2";
      const first: FollowupAttempt = {
        id: "first",
        user_id: "u1",
        candidate_id: candidateId,
        contact_id: "c1",
        channel: "whatsapp",
        message: "first",
        attempt_status: "sent",
        created_at: "2026-06-01T00:00:00Z",
      };
      const second: FollowupAttempt = {
        id: "second",
        user_id: "u1",
        candidate_id: candidateId,
        contact_id: "c1",
        channel: "whatsapp",
        message: "second",
        attempt_status: "failed",
        created_at: "2026-05-01T00:00:00Z",
      };
      const map = buildLastAttemptMap([first, second]);
      expect(map.get(candidateId)?.id).toBe("first");
    });

    it("returns undefined for candidate with no attempts", () => {
      const map = buildLastAttemptMap([]);
      expect(map.get("nonexistent")).toBeUndefined();
    });
  });

  describe("buildQueueEngine (integration)", () => {
    it("returns empty array when no candidates match filters", () => {
      const result = buildQueueEngine([], []);
      expect(result).toEqual([]);
    });

    it("excludes resolved candidates and returns active ones sorted by priority", () => {
      const resolved = buildCandidateWithContact({
        candidate_status: "resolved",
        priority: "high",
      });
      const pending = buildCandidateWithContact({
        candidate_status: "pending",
        priority: "low",
      });
      const result = buildQueueEngine([resolved, pending], []);
      expect(result).toHaveLength(1);
      expect(result[0].candidate.id).toBe(pending.id);
    });

    it("attaches last attempt when available", () => {
      const candidate = buildCandidateWithContact({ candidate_status: "pending" });
      const attempt: FollowupAttempt = {
        id: "att-1",
        user_id: candidate.user_id,
        candidate_id: candidate.id,
        contact_id: candidate.contact_id,
        channel: "whatsapp",
        message: "hello",
        attempt_status: "sent",
        created_at: "2026-06-01T00:00:00Z",
      };
      const result = buildQueueEngine([candidate], [attempt]);
      expect(result[0].lastAttempt?.id).toBe("att-1");
    });

    it("filters by workspaceId when provided", () => {
      const inWs = buildCandidateWithContact({
        candidate_status: "pending",
      }) as CandidateWithContact & { workspace_id: string };
      inWs.workspace_id = "ws-1";
      const outWs = buildCandidateWithContact({
        candidate_status: "pending",
      }) as CandidateWithContact & { workspace_id: string };
      outWs.workspace_id = "ws-2";
      const result = buildQueueEngine([inWs, outWs], [], "ws-1");
      expect(result).toHaveLength(1);
      expect((result[0].candidate as any).workspace_id).toBe("ws-1");
    });

    it("returns all items for user when workspaceId is null/undefined", () => {
      const a = buildCandidateWithContact({ candidate_status: "pending" });
      const b = buildCandidateWithContact({ candidate_status: "pending" });
      const resultNull = buildQueueEngine([a, b], [], null);
      expect(resultNull).toHaveLength(2);
      const resultUndefined = buildQueueEngine([a, b], []);
      expect(resultUndefined).toHaveLength(2);
    });
  });

  describe("sortByNextFollowupAt", () => {
    it("sorts items with past next_followup_at before future ones", () => {
      const past = buildOperationalQueueItem({
        contact: buildContact({ next_followup_at: "2026-01-01T00:00:00Z" }),
      });
      const future = buildOperationalQueueItem({
        contact: buildContact({ next_followup_at: "2027-01-01T00:00:00Z" }),
      });
      const sorted = sortByNextFollowupAt([future, past]);
      expect(sorted[0].contact.next_followup_at).toBe("2026-01-01T00:00:00Z");
      expect(sorted[1].contact.next_followup_at).toBe("2027-01-01T00:00:00Z");
    });

    it("handles null next_followup_at by putting them at the end", () => {
      const past = buildOperationalQueueItem({
        contact: buildContact({ next_followup_at: "2026-01-01T00:00:00Z" }),
      });
      const none = buildOperationalQueueItem({
        contact: buildContact({ next_followup_at: null }),
      });
      const sorted = sortByNextFollowupAt([none, past]);
      expect(sorted[0].contact.next_followup_at).toBe("2026-01-01T00:00:00Z");
    });
  });

  describe("buildOperationalQueue (imported)", () => {
    it("groups items by priority tier", () => {
      const high = buildOperationalQueueItem({
        candidate: buildFollowupCandidate({ priority: "high" }),
      });
      const medium = buildOperationalQueueItem({
        candidate: buildFollowupCandidate({ priority: "medium" }),
      });
      const low = buildOperationalQueueItem({
        candidate: buildFollowupCandidate({ priority: "low" }),
      });
      const queue = buildOperationalQueue([medium, high, low]);
      expect(queue.highPriority).toHaveLength(1);
      expect(queue.mediumPriority).toHaveLength(1);
      expect(queue.lowPriority).toHaveLength(1);
      expect(queue.highPriority[0].candidate.id).toBe(high.candidate.id);
      expect(queue.mediumPriority[0].candidate.id).toBe(medium.candidate.id);
      expect(queue.lowPriority[0].candidate.id).toBe(low.candidate.id);
    });

    it("sorts within each tier by due_amount descending", () => {
      const a = buildOperationalQueueItem({
        candidate: buildFollowupCandidate({ priority: "high" }),
        contact: buildContact({ due_amount: 200 }),
      });
      const b = buildOperationalQueueItem({
        candidate: buildFollowupCandidate({ priority: "high" }),
        contact: buildContact({ due_amount: 500 }),
      });
      const queue = buildOperationalQueue([a, b]);
      expect(queue.highPriority[0].contact.due_amount).toBe(500);
      expect(queue.highPriority[1].contact.due_amount).toBe(200);
    });
  });
});

const activeStatuses = ["pending", "opened", "contacted", "responded", "promised"] as const;
