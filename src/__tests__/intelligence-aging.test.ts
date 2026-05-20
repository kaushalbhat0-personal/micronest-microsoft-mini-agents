import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateAgingBucket, getAgingScore, getAgingBuckets } from "@/features/intelligence/services/queue-aging";

describe("calculateAgingBucket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns fresh when generated less than 24 hours ago", () => {
    const generated = new Date("2026-01-15T11:00:00.000Z").toISOString();
    const result = calculateAgingBucket(generated);
    expect(result.bucket).toBe("fresh");
    expect(result.hoursSinceGeneration).toBeGreaterThan(0);
    expect(result.hoursSinceGeneration).toBeLessThan(24);
  });

  it("returns aging when generated 24-72 hours ago", () => {
    const generated = new Date("2026-01-14T10:00:00.000Z").toISOString();
    const result = calculateAgingBucket(generated);
    expect(result.bucket).toBe("aging");
    expect(result.hoursSinceGeneration).toBeGreaterThanOrEqual(24);
    expect(result.hoursSinceGeneration).toBeLessThan(72);
  });

  it("returns stale when generated 72-168 hours ago", () => {
    const generated = new Date("2026-01-12T10:00:00.000Z").toISOString();
    const result = calculateAgingBucket(generated);
    expect(result.bucket).toBe("stale");
    expect(result.hoursSinceGeneration).toBeGreaterThanOrEqual(72);
    expect(result.hoursSinceGeneration).toBeLessThan(168);
  });

  it("returns critical when generated more than 168 hours ago", () => {
    const generated = new Date("2026-01-08T10:00:00.000Z").toISOString();
    const result = calculateAgingBucket(generated);
    expect(result.bucket).toBe("critical");
    expect(result.hoursSinceGeneration).toBeGreaterThanOrEqual(168);
  });

  it("returns critical when generated exactly at the critical threshold", () => {
    const generated = new Date("2026-01-08T12:00:00.000Z").toISOString();
    const result = calculateAgingBucket(generated);
    expect(result.bucket).toBe("critical");
    expect(result.hoursSinceGeneration).toBe(168);
  });

  it("is deterministic for the same input", () => {
    const generated = new Date("2026-01-14T10:00:00.000Z").toISOString();
    const first = calculateAgingBucket(generated);
    const second = calculateAgingBucket(generated);
    expect(first.bucket).toBe(second.bucket);
    expect(first.hoursSinceGeneration).toBe(second.hoursSinceGeneration);
  });
});

describe("getAgingScore", () => {
  it("returns 0 for fresh", () => {
    expect(getAgingScore("fresh")).toBe(0);
  });

  it("returns 20 for aging", () => {
    expect(getAgingScore("aging")).toBe(20);
  });

  it("returns 40 for stale", () => {
    expect(getAgingScore("stale")).toBe(40);
  });

  it("returns 60 for critical", () => {
    expect(getAgingScore("critical")).toBe(60);
  });
});

describe("getAgingBuckets", () => {
  it("returns all 4 buckets with correct scores", () => {
    const result = getAgingBuckets();
    expect(result).toEqual({
      fresh: { score: 0, label: "Fresh" },
      aging: { score: 20, label: "Aging" },
      stale: { score: 40, label: "Stale" },
      critical: { score: 60, label: "Critical" },
    });
  });
});
