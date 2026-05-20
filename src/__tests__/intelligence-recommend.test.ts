import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scoreContact, recommendNextContact } from "@/features/intelligence/services/recommend-next-contact";
import type { ScoringInput } from "@/features/intelligence/services/recommend-next-contact";
import { recommendNextAction } from "@/features/intelligence/services/recommend-next-action";
import type { ActionInput } from "@/features/intelligence/services/recommend-next-action";
import type { OperationalQueueItem } from "@/features/followups/types";

const baseScoringInput: ScoringInput = {
  candidate: {
    id: "cand-1",
    user_id: "user-1",
    contact_id: "contact-1",
    priority: "medium",
    reason: "Test followup",
    candidate_status: "pending",
    generated_at: "2026-01-15T10:00:00.000Z",
  },
  contact: {
    id: "contact-1",
    user_id: "user-1",
    upload_id: null,
    customer_name: "Test",
    phone_number: "12025550199",
    total_amount: 1000,
    paid_amount: 500,
    due_amount: 5000,
    due_date: null,
    workflow_status: "active",
    next_followup_at: null,
    raw_data: {},
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
    sla_due_at: undefined,
    escalation_level: 0,
    promise_due_at: undefined,
    last_promise_broken_at: undefined,
    recovery_score: 100,
    risk_level: "low",
  },
  pledge: {
    slaDueAt: undefined,
    escalationLevel: 0,
    promiseDueAt: undefined,
    lastPromiseBrokenAt: undefined,
    recoveryScore: 100,
    riskLevel: "low",
    agingBucket: "fresh",
  },
};

describe("scoreContact", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with priority score", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      candidate: { ...baseScoringInput.candidate, priority: "high" },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Priority: high");
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it("adds 40 points for SLA breach", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, slaDueAt: "2026-01-15T10:00:00.000Z" },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("SLA breached");
    expect(result.score).toBeGreaterThanOrEqual(55);
  });

  it("adds 10 points per escalation level", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, escalationLevel: 3 },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Escalation level 3");
    expect(result.score).toBeGreaterThanOrEqual(45);
  });

  it("adds aging score for non-fresh buckets", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, agingBucket: "stale" },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Queue: stale");
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it("adds recovery weight inversely", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, recoveryScore: 30 },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Low recovery score");
  });

  it("adds 25 points for overdue promise", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, promiseDueAt: "2026-01-14T10:00:00.000Z" },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Promise overdue");
  });

  it("adds 15 points for promise due soon", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, promiseDueAt: "2026-01-15T18:00:00.000Z" },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Promise due soon");
  });

  it("adds 15 points for high amount over 10000", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      contact: { ...baseScoringInput.contact, due_amount: 15000 },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("High amount: 15000");
  });

  it("adds 8 points for medium amount 5000-10000", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      contact: { ...baseScoringInput.contact, due_amount: 7500 },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Medium amount: 7500");
  });

  it("adds 20 points for critical risk level", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, riskLevel: "critical" },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("Critical risk");
  });

  it("adds 10 points for high risk level", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      pledge: { ...baseScoringInput.pledge, riskLevel: "high" },
    };
    const result = scoreContact(input);
    expect(result.reasons).toContain("High risk");
  });

  it("clamps score between 0 and 100", () => {
    const input: ScoringInput = {
      ...baseScoringInput,
      candidate: { ...baseScoringInput.candidate, priority: "high" },
      pledge: {
        ...baseScoringInput.pledge,
        slaDueAt: "2026-01-14T10:00:00.000Z",
        escalationLevel: 5,
        agingBucket: "critical",
        recoveryScore: 0,
        promiseDueAt: "2026-01-14T10:00:00.000Z",
        riskLevel: "critical",
      },
      contact: { ...baseScoringInput.contact, due_amount: 20000 },
    };
    const result = scoreContact(input);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe("recommendNextContact", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for empty items", () => {
    const result = recommendNextContact([], vi.fn() as unknown as (item: OperationalQueueItem) => ScoringInput);
    expect(result).toBeNull();
  });

  it("returns recommendation for single item", () => {
    const item: OperationalQueueItem = {
      candidate: {
        id: "cand-1", user_id: "user-1", contact_id: "contact-1",
        priority: "high", reason: "Test", candidate_status: "pending",
        generated_at: "2026-01-15T10:00:00.000Z",
      },
      contact: {
        id: "contact-1", user_id: "user-1", upload_id: null,
        customer_name: "Test", phone_number: "12025550199",
        total_amount: 1000, paid_amount: 500, due_amount: 5000,
        due_date: null, workflow_status: "active", next_followup_at: null,
        raw_data: {}, created_at: "2026-01-15T10:00:00.000Z",
        updated_at: "2026-01-15T10:00:00.000Z",
      },
    };
    const scoringFn = () => ({
      candidate: item.candidate,
      contact: item.contact,
      pledge: {
        slaDueAt: undefined, escalationLevel: 0,
        promiseDueAt: undefined, lastPromiseBrokenAt: undefined,
        recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const,
      },
    });
    const result = recommendNextContact([item], scoringFn);
    expect(result).not.toBeNull();
    expect(result!.contactId).toBe("contact-1");
  });

  it("sorts by score descending", () => {
    const item1: OperationalQueueItem = {
      candidate: {
        id: "cand-1", user_id: "user-1", contact_id: "contact-1",
        priority: "low", reason: "Test", candidate_status: "pending",
        generated_at: "2026-01-15T08:00:00.000Z",
      },
      contact: {
        id: "contact-1", user_id: "user-1", upload_id: null,
        customer_name: "A", phone_number: "1", total_amount: 100,
        paid_amount: 0, due_amount: 100, due_date: null,
        workflow_status: "active", next_followup_at: null,
        raw_data: {}, created_at: "2026-01-15T08:00:00.000Z",
        updated_at: "2026-01-15T08:00:00.000Z",
      },
    };
    const item2: OperationalQueueItem = {
      candidate: {
        id: "cand-2", user_id: "user-1", contact_id: "contact-2",
        priority: "high", reason: "Test", candidate_status: "pending",
        generated_at: "2026-01-15T09:00:00.000Z",
      },
      contact: {
        id: "contact-2", user_id: "user-1", upload_id: null,
        customer_name: "B", phone_number: "2", total_amount: 100,
        paid_amount: 0, due_amount: 100, due_date: null,
        workflow_status: "active", next_followup_at: null,
        raw_data: {}, created_at: "2026-01-15T09:00:00.000Z",
        updated_at: "2026-01-15T09:00:00.000Z",
      },
    };
    const scoringFn = (item: OperationalQueueItem) => ({
      candidate: item.candidate,
      contact: item.contact,
      pledge: {
        slaDueAt: undefined, escalationLevel: 0,
        promiseDueAt: undefined, lastPromiseBrokenAt: undefined,
        recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const,
      },
    });
    const result = recommendNextContact([item1, item2], scoringFn);
    expect(result).not.toBeNull();
    expect(result!.contactId).toBe("contact-2");
  });

  it("breaks ties by oldest generated_at first", () => {
    const item1: OperationalQueueItem = {
      candidate: {
        id: "cand-1", user_id: "user-1", contact_id: "contact-1",
        priority: "medium", reason: "Test", candidate_status: "pending",
        generated_at: "2026-01-15T08:00:00.000Z",
      },
      contact: {
        id: "contact-1", user_id: "user-1", upload_id: null,
        customer_name: "A", phone_number: "1", total_amount: 100,
        paid_amount: 0, due_amount: 100, due_date: null,
        workflow_status: "active", next_followup_at: null,
        raw_data: {}, created_at: "2026-01-15T08:00:00.000Z",
        updated_at: "2026-01-15T08:00:00.000Z",
      },
    };
    const item2: OperationalQueueItem = {
      candidate: {
        id: "cand-2", user_id: "user-1", contact_id: "contact-2",
        priority: "medium", reason: "Test", candidate_status: "pending",
        generated_at: "2026-01-15T09:00:00.000Z",
      },
      contact: {
        id: "contact-2", user_id: "user-1", upload_id: null,
        customer_name: "B", phone_number: "2", total_amount: 100,
        paid_amount: 0, due_amount: 100, due_date: null,
        workflow_status: "active", next_followup_at: null,
        raw_data: {}, created_at: "2026-01-15T09:00:00.000Z",
        updated_at: "2026-01-15T09:00:00.000Z",
      },
    };
    const scoringFn = () => ({
      candidate: { id: "", user_id: "", contact_id: "", priority: "medium" as const, reason: "", candidate_status: "pending" as const, generated_at: "" },
      contact: { id: "", user_id: "", upload_id: null, customer_name: "", phone_number: "", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active" as const, next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      pledge: {
        slaDueAt: undefined, escalationLevel: 0,
        promiseDueAt: undefined, lastPromiseBrokenAt: undefined,
        recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const,
      },
    });
    const result = recommendNextContact([item1, item2], scoringFn);
    expect(result!.contactId).toBe("contact-1");
  });

  it("returns action contact_now when score >= 50", () => {
    const item: OperationalQueueItem = {
      candidate: {
        id: "cand-1", user_id: "user-1", contact_id: "contact-1",
        priority: "high", reason: "Test", candidate_status: "pending",
        generated_at: "2026-01-15T10:00:00.000Z",
      },
      contact: {
        id: "contact-1", user_id: "user-1", upload_id: null,
        customer_name: "Test", phone_number: "12025550199",
        total_amount: 1000, paid_amount: 500, due_amount: 5000,
        due_date: null, workflow_status: "active", next_followup_at: null,
        raw_data: {}, created_at: "2026-01-15T10:00:00.000Z",
        updated_at: "2026-01-15T10:00:00.000Z",
      },
    };
    const scoringFn = () => ({
      candidate: item.candidate,
      contact: item.contact,
      pledge: {
        slaDueAt: "2026-01-14T10:00:00.000Z", escalationLevel: 1,
        promiseDueAt: undefined, lastPromiseBrokenAt: undefined,
        recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const,
      },
    });
    const result = recommendNextContact([item], scoringFn);
    expect(result!.action).toBe("contact_now");
  });
});

describe("recommendNextAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseActionInput: ActionInput = {
    contact: { id: "contact-1", user_id: "user-1", upload_id: null, customer_name: "Test", phone_number: "1", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
    candidate: { id: "cand-1", user_id: "user-1", contact_id: "contact-1", priority: "medium", reason: "Test", candidate_status: "pending", generated_at: "2026-01-15T10:00:00.000Z" },
    slaDueAt: undefined,
    escalationLevel: 0,
    promiseDueAt: undefined,
    recoveryScore: 50,
    riskLevel: "low",
    lastAttemptWasRecent: false,
    attemptsToday: 0,
  };

  it("returns contact_now when score >= 50", () => {
    const input: ActionInput = {
      ...baseActionInput,
      slaDueAt: "2026-01-14T10:00:00.000Z",
      escalationLevel: 1,
    };
    const result = recommendNextAction(input);
    expect(result.action).toBe("contact_now");
  });

  it("returns wait when score < 50", () => {
    const input: ActionInput = {
      ...baseActionInput,
    };
    const result = recommendNextAction(input);
    expect(result.action).toBe("wait");
  });

  it("returns escalate when escalationLevel >= 3 and score < 50", () => {
    const input: ActionInput = {
      ...baseActionInput,
      escalationLevel: 3,
    };
    const result = recommendNextAction(input);
    expect(result.action).toBe("escalate");
  });

  it("returns wait when multiple attempts today and recent attempt", () => {
    const input: ActionInput = {
      ...baseActionInput,
      lastAttemptWasRecent: true,
      attemptsToday: 4,
      slaDueAt: "2026-01-14T10:00:00.000Z",
    };
    const result = recommendNextAction(input);
    expect(result.action).toBe("wait");
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.reasons).toContain("Multiple attempts today - consider waiting");
  });

  it("adds 15 points when untouched today with high recovery", () => {
    const input: ActionInput = {
      ...baseActionInput,
      attemptsToday: 0,
      recoveryScore: 70,
    };
    const result = recommendNextAction(input);
    expect(result.reasons).toContain("Untouched today, good recovery potential");
  });

  it("adds 30 points for critical risk level", () => {
    const input: ActionInput = {
      ...baseActionInput,
      riskLevel: "critical",
    };
    const result = recommendNextAction(input);
    expect(result.reasons).toContain("Critical risk contact");
  });

  it("adds 20 points for high risk level", () => {
    const input: ActionInput = {
      ...baseActionInput,
      riskLevel: "high",
    };
    const result = recommendNextAction(input);
    expect(result.reasons).toContain("High risk contact");
  });

  it("adds 35 points for SLA breach", () => {
    const input: ActionInput = {
      ...baseActionInput,
      slaDueAt: "2026-01-14T10:00:00.000Z",
    };
    const result = recommendNextAction(input);
    expect(result.reasons).toContain("SLA breached");
  });

  it("adds 30 points for promise overdue", () => {
    const input: ActionInput = {
      ...baseActionInput,
      promiseDueAt: "2026-01-14T10:00:00.000Z",
    };
    const result = recommendNextAction(input);
    expect(result.reasons).toContain("Promise overdue");
  });

  it("adds 20 points for promise due within 24h", () => {
    const input: ActionInput = {
      ...baseActionInput,
      promiseDueAt: "2026-01-15T18:00:00.000Z",
    };
    const result = recommendNextAction(input);
    expect(result.reasons).toContain("Promise due within 24h");
  });
});
