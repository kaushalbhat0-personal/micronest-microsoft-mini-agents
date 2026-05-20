import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prioritizeQueueV2 } from "@/features/intelligence/services/prioritize-queue-v2";
import type { OperationalQueueItem } from "@/features/followups/types";

describe("prioritizeQueueV2", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty array for empty input", () => {
    const result = prioritizeQueueV2({ items: [], intelligenceMap: new Map() });
    expect(result).toEqual([]);
  });

  it("sorts by priority tier first (high before medium before low)", () => {
    const items: OperationalQueueItem[] = [
      {
        candidate: { id: "c1", user_id: "u", contact_id: "ct1", priority: "low", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T10:00:00.000Z" },
        contact: { id: "ct1", user_id: "u", upload_id: null, customer_name: "A", phone_number: "1", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
      {
        candidate: { id: "c2", user_id: "u", contact_id: "ct2", priority: "high", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T09:00:00.000Z" },
        contact: { id: "ct2", user_id: "u", upload_id: null, customer_name: "B", phone_number: "2", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
      {
        candidate: { id: "c3", user_id: "u", contact_id: "ct3", priority: "medium", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T08:00:00.000Z" },
        contact: { id: "ct3", user_id: "u", upload_id: null, customer_name: "C", phone_number: "3", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
    ];
    const map = new Map();
    map.set("c1", { slaDueAt: undefined, escalationLevel: 0, promiseDueAt: undefined, recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const, intelligenceScore: 0 });
    map.set("c2", { slaDueAt: undefined, escalationLevel: 0, promiseDueAt: undefined, recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const, intelligenceScore: 0 });
    map.set("c3", { slaDueAt: undefined, escalationLevel: 0, promiseDueAt: undefined, recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const, intelligenceScore: 0 });
    const result = prioritizeQueueV2({ items, intelligenceMap: map });
    expect(result[0].candidate.priority).toBe("high");
    expect(result[1].candidate.priority).toBe("medium");
    expect(result[2].candidate.priority).toBe("low");
  });

  it("prioritizes sla breach within the same priority tier", () => {
    const items: OperationalQueueItem[] = [
      {
        candidate: { id: "c1", user_id: "u", contact_id: "ct1", priority: "medium", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T10:00:00.000Z" },
        contact: { id: "ct1", user_id: "u", upload_id: null, customer_name: "A", phone_number: "1", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
      {
        candidate: { id: "c2", user_id: "u", contact_id: "ct2", priority: "medium", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T09:00:00.000Z" },
        contact: { id: "ct2", user_id: "u", upload_id: null, customer_name: "B", phone_number: "2", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
    ];
    const map = new Map();
    map.set("c1", { slaDueAt: "2026-01-14T10:00:00.000Z", escalationLevel: 0, promiseDueAt: undefined, recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const, intelligenceScore: 0 });
    map.set("c2", { slaDueAt: undefined, escalationLevel: 0, promiseDueAt: undefined, recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const, intelligenceScore: 0 });
    const result = prioritizeQueueV2({ items, intelligenceMap: map });
    expect(result[0].candidate.id).toBe("c1");
  });

  it("sorts items without metadata by generated_at descending", () => {
    const items: OperationalQueueItem[] = [
      {
        candidate: { id: "c1", user_id: "u", contact_id: "ct1", priority: "low", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T10:00:00.000Z" },
        contact: { id: "ct1", user_id: "u", upload_id: null, customer_name: "A", phone_number: "1", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
      {
        candidate: { id: "c2", user_id: "u", contact_id: "ct2", priority: "low", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T09:00:00.000Z" },
        contact: { id: "ct2", user_id: "u", upload_id: null, customer_name: "B", phone_number: "2", total_amount: null, paid_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
    ];
    const map = new Map();
    const result = prioritizeQueueV2({ items, intelligenceMap: map });
    expect(result[0].candidate.id).toBe("c2");
    expect(result[1].candidate.id).toBe("c1");
  });

  it("breaks ties by oldest generated_at first", () => {
    const items: OperationalQueueItem[] = [
      {
        candidate: { id: "c1", user_id: "u", contact_id: "ct1", priority: "medium", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T10:00:00.000Z" },
        contact: { id: "ct1", user_id: "u", upload_id: null, customer_name: "A", phone_number: "1", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
      {
        candidate: { id: "c2", user_id: "u", contact_id: "ct2", priority: "medium", reason: "r", candidate_status: "pending", generated_at: "2026-01-15T08:00:00.000Z" },
        contact: { id: "ct2", user_id: "u", upload_id: null, customer_name: "B", phone_number: "2", total_amount: null, paid_amount: null, due_amount: null, due_date: null, workflow_status: "active", next_followup_at: null, raw_data: {}, created_at: "", updated_at: "" },
      },
    ];
    const map = new Map();
    map.set("c1", { slaDueAt: undefined, escalationLevel: 0, promiseDueAt: undefined, recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const, intelligenceScore: 0 });
    map.set("c2", { slaDueAt: undefined, escalationLevel: 0, promiseDueAt: undefined, recoveryScore: 100, riskLevel: "low" as const, agingBucket: "fresh" as const, intelligenceScore: 0 });
    const result = prioritizeQueueV2({ items, intelligenceMap: map });
    expect(result[0].candidate.id).toBe("c2");
    expect(result[1].candidate.id).toBe("c1");
  });
});
