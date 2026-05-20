import { describe, it, expect } from "vitest";
import { calculateOperatorLoad, recommendReassignment, isOverloaded, getOperatorLoadLabel } from "@/features/intelligence/services/workload-balancer";
import type { OperatorLoad } from "@/features/intelligence/types";

describe("calculateOperatorLoad", () => {
  it("computes score as assignedCount*1 + activeSessions*3 + overdueCount*2 + slaBurden*4", () => {
    const result = calculateOperatorLoad({
      assignedCount: 10,
      activeSessions: 5,
      overdueCount: 3,
      slaBurden: 2,
    });
    expect(result.totalScore).toBe(10 * 1 + 5 * 3 + 3 * 2 + 2 * 4);
    expect(result.assignedCount).toBe(10);
    expect(result.activeSessions).toBe(5);
    expect(result.overdueCount).toBe(3);
    expect(result.slaBurden).toBe(2);
  });

  it("handles zero values", () => {
    const result = calculateOperatorLoad({
      assignedCount: 0,
      activeSessions: 0,
      overdueCount: 0,
      slaBurden: 0,
    });
    expect(result.totalScore).toBe(0);
  });
});

describe("recommendReassignment", () => {
  it("returns empty array when no operators are overloaded", () => {
    const loads: OperatorLoad[] = [
      { userId: "a", assignedCount: 5, activeSessions: 2, overdueCount: 1, slaBurden: 0, totalScore: 16 },
      { userId: "b", assignedCount: 3, activeSessions: 1, overdueCount: 0, slaBurden: 0, totalScore: 6 },
    ];
    expect(recommendReassignment(loads)).toEqual([]);
  });

  it("returns empty array when no operators are underloaded", () => {
    const loads: OperatorLoad[] = [
      { userId: "a", assignedCount: 30, activeSessions: 10, overdueCount: 5, slaBurden: 5, totalScore: 80 },
    ];
    expect(recommendReassignment(loads)).toEqual([]);
  });

  it("returns reassignment recommendations pairing overloaded with underloaded", () => {
    const loads: OperatorLoad[] = [
      { userId: "over-1", assignedCount: 30, activeSessions: 10, overdueCount: 5, slaBurden: 5, totalScore: 80 },
      { userId: "under-1", assignedCount: 2, activeSessions: 0, overdueCount: 0, slaBurden: 0, totalScore: 2 },
    ];
    const result = recommendReassignment(loads);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].fromUserId).toBe("over-1");
    expect(result[0].toUserId).toBe("under-1");
    expect(result[0].count).toBeGreaterThan(0);
  });

  it("returns empty when only one operator is borderline loaded", () => {
    const loads: OperatorLoad[] = [
      { userId: "a", assignedCount: 15, activeSessions: 5, overdueCount: 3, slaBurden: 2, totalScore: 44 },
    ];
    expect(recommendReassignment(loads)).toEqual([]);
  });
});

describe("isOverloaded", () => {
  it("returns true when totalScore > 50", () => {
    const load: OperatorLoad = { userId: "a", assignedCount: 20, activeSessions: 10, overdueCount: 5, slaBurden: 3, totalScore: 62 };
    expect(isOverloaded(load)).toBe(true);
  });

  it("returns false when totalScore <= 50", () => {
    const load: OperatorLoad = { userId: "a", assignedCount: 10, activeSessions: 3, overdueCount: 2, slaBurden: 1, totalScore: 26 };
    expect(isOverloaded(load)).toBe(false);
  });

  it("returns false when totalScore is exactly 50", () => {
    const load: OperatorLoad = { userId: "a", assignedCount: 10, activeSessions: 5, overdueCount: 5, slaBurden: 2, totalScore: 50 };
    expect(isOverloaded(load)).toBe(false);
  });
});

describe("getOperatorLoadLabel", () => {
  it("returns underloaded when totalScore <= 0", () => {
    const load: OperatorLoad = { userId: "a", assignedCount: 0, activeSessions: 0, overdueCount: 0, slaBurden: 0, totalScore: 0 };
    expect(getOperatorLoadLabel(load)).toBe("underloaded");
  });

  it("returns optimal when totalScore <= 30", () => {
    const load: OperatorLoad = { userId: "a", assignedCount: 10, activeSessions: 3, overdueCount: 2, slaBurden: 1, totalScore: 26 };
    expect(getOperatorLoadLabel(load)).toBe("optimal");
  });

  it("returns loaded when totalScore <= 50", () => {
    const load: OperatorLoad = { userId: "a", assignedCount: 15, activeSessions: 5, overdueCount: 3, slaBurden: 2, totalScore: 44 };
    expect(getOperatorLoadLabel(load)).toBe("loaded");
  });

  it("returns overloaded when totalScore > 50", () => {
    const load: OperatorLoad = { userId: "a", assignedCount: 20, activeSessions: 10, overdueCount: 5, slaBurden: 3, totalScore: 62 };
    expect(getOperatorLoadLabel(load)).toBe("overloaded");
  });
});
