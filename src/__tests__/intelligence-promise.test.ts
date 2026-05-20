import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectBrokenPromise, hasActivePromise } from "@/features/intelligence/services/detect-broken-promise";
import { calculatePromiseRisk, isPromiseOverdue, hasRepeatedBrokenPromises } from "@/features/intelligence/services/calculate-promise-risk";
import type { PromiseRiskInput } from "@/features/intelligence/services/calculate-promise-risk";

describe("detectBrokenPromise", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when promise_due_at is missing", () => {
    expect(detectBrokenPromise({})).toBeNull();
    expect(detectBrokenPromise({ promise_due_at: null })).toBeNull();
  });

  it("returns null when promise is not yet due", () => {
    const contact = { promise_due_at: "2026-01-15T14:00:00.000Z" };
    expect(detectBrokenPromise(contact)).toBeNull();
  });

  it("returns isBroken when promise is past due", () => {
    const contact = { promise_due_at: "2026-01-14T10:00:00.000Z" };
    const result = detectBrokenPromise(contact);
    expect(result).not.toBeNull();
    expect(result!.isBroken).toBe(true);
    expect(result!.hoursOverdue).toBeGreaterThan(0);
    expect(result!.daysOverdue).toBe(1);
  });

  it("calculates correct daysOverdue", () => {
    const contact = { promise_due_at: "2026-01-10T12:00:00.000Z" };
    const result = detectBrokenPromise(contact);
    expect(result!.daysOverdue).toBe(5);
  });
});

describe("hasActivePromise", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when promise due date is in the future", () => {
    expect(hasActivePromise("2026-01-15T14:00:00.000Z")).toBe(true);
  });

  it("returns false when promise due date is in the past", () => {
    expect(hasActivePromise("2026-01-14T10:00:00.000Z")).toBe(false);
  });

  it("returns false when promiseDueAt is null", () => {
    expect(hasActivePromise(null)).toBe(false);
  });
});

describe("calculatePromiseRisk", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns risk none when no promiseDueAt", () => {
    const input: PromiseRiskInput = {
      promiseDueAt: null,
      lastPromiseBrokenAt: null,
      totalPromises: 0,
      brokenPromises: 0,
      recoveryScore: 50,
    };
    const result = calculatePromiseRisk(input);
    expect(result.risk).toBe("none");
    expect(result.score).toBe(0);
    expect(result.reasons).toContain("No active promise");
  });

  it("returns risk none when promise is on track (>72h away)", () => {
    const input: PromiseRiskInput = {
      promiseDueAt: "2026-01-20T12:00:00.000Z",
      lastPromiseBrokenAt: null,
      totalPromises: 1,
      brokenPromises: 0,
      recoveryScore: 50,
    };
    const result = calculatePromiseRisk(input);
    expect(result.risk).toBe("none");
    expect(result.score).toBe(0);
    expect(result.reasons).toContain("Promise on track");
  });

  it("returns at_risk when promise due within 72 hours", () => {
    const input: PromiseRiskInput = {
      promiseDueAt: "2026-01-17T12:00:00.000Z",
      lastPromiseBrokenAt: null,
      totalPromises: 1,
      brokenPromises: 0,
      recoveryScore: 50,
    };
    const result = calculatePromiseRisk(input);
    expect(result.risk).toBe("at_risk");
    expect(result.score).toBe(30);
    expect(result.reasons).toContain("Promise due within 3 days");
  });

  it("returns due_soon when promise due within 24 hours", () => {
    const input: PromiseRiskInput = {
      promiseDueAt: "2026-01-16T06:00:00.000Z",
      lastPromiseBrokenAt: null,
      totalPromises: 1,
      brokenPromises: 0,
      recoveryScore: 50,
    };
    const result = calculatePromiseRisk(input);
    expect(result.risk).toBe("due_soon");
    expect(result.score).toBe(60);
    expect(result.reasons).toContain("Promise due within 24 hours");
  });

  it("returns due_soon with broken promises history", () => {
    const input: PromiseRiskInput = {
      promiseDueAt: "2026-01-16T06:00:00.000Z",
      lastPromiseBrokenAt: "2026-01-10T12:00:00.000Z",
      totalPromises: 3,
      brokenPromises: 2,
      recoveryScore: 50,
    };
    const result = calculatePromiseRisk(input);
    expect(result.risk).toBe("due_soon");
    expect(result.reasons).toContain("History of broken promises");
  });

  it("returns overdue when promise is past due", () => {
    const input: PromiseRiskInput = {
      promiseDueAt: "2026-01-13T12:00:00.000Z",
      lastPromiseBrokenAt: null,
      totalPromises: 1,
      brokenPromises: 0,
      recoveryScore: 50,
    };
    const result = calculatePromiseRisk(input);
    expect(result.risk).toBe("overdue");
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain("Promise overdue by 2 day(s)");
  });

  it("includes broken promises count in overdue score", () => {
    const input: PromiseRiskInput = {
      promiseDueAt: "2026-01-13T12:00:00.000Z",
      lastPromiseBrokenAt: "2026-01-10T12:00:00.000Z",
      totalPromises: 3,
      brokenPromises: 2,
      recoveryScore: 50,
    };
    const result = calculatePromiseRisk(input);
    expect(result.risk).toBe("overdue");
    expect(result.reasons).toContain("2 previous broken promise(s)");
  });
});

describe("isPromiseOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when promise is past due", () => {
    expect(isPromiseOverdue("2026-01-14T10:00:00.000Z")).toBe(true);
  });

  it("returns false when promise is in the future", () => {
    expect(isPromiseOverdue("2026-01-16T10:00:00.000Z")).toBe(false);
  });
});

describe("hasRepeatedBrokenPromises", () => {
  it("returns true for 2 or more broken promises", () => {
    expect(hasRepeatedBrokenPromises(2)).toBe(true);
    expect(hasRepeatedBrokenPromises(5)).toBe(true);
  });

  it("returns false for less than 2 broken promises", () => {
    expect(hasRepeatedBrokenPromises(0)).toBe(false);
    expect(hasRepeatedBrokenPromises(1)).toBe(false);
  });
});
