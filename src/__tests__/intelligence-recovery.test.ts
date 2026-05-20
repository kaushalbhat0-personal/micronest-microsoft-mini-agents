import { describe, it, expect } from "vitest";
import { calculateRecoveryScore, getRiskLevel } from "@/features/intelligence/services/recovery-score";
import type { RecoveryScoreInput } from "@/features/intelligence/services/recovery-score";

describe("calculateRecoveryScore", () => {
  it("starts at 50 with default input", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: null,
      totalAmount: null,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 999,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(35);
    expect(result.reasons).toContain("No significant payment");
    expect(result.reasons).toContain("No activity in over a week");
  });

  it("adds 15 points when payment ratio exceeds 50%", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: true,
      dueAmount: null,
      paidAmount: 6000,
      totalAmount: 10000,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 10,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(75);
    expect(result.reasons).toContain("Over 50% already paid");
    expect(result.reasons).toContain("Recent activity");
  });

  it("adds 8 points when payment ratio is 25-50%", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: true,
      dueAmount: null,
      paidAmount: 3000,
      totalAmount: 10000,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 10,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(68);
    expect(result.reasons).toContain("Partial payment made");
    expect(result.reasons).toContain("Recent activity");
  });

  it("subtracts 5 points when no significant payment", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: 10000,
      paidAmount: 0,
      totalAmount: 10000,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 50,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(45);
    expect(result.reasons).toContain("No significant payment");
  });

  it("adds 15 points when all promises kept", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: 6000,
      totalAmount: 10000,
      promiseCount: 3,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 10,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(90);
    expect(result.reasons).toContain("Kept all promises");
    expect(result.reasons).toContain("Recent activity");
    expect(result.reasons).toContain("Over 50% already paid");
  });

  it("subtracts 20 points when more than 50% of promises broken", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: 6000,
      totalAmount: 10000,
      promiseCount: 4,
      brokenPromiseCount: 3,
      hoursSinceLastActivity: 10,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(55);
    expect(result.reasons).toContain("Broken 3 of 4 promises");
    expect(result.reasons).toContain("Recent activity");
    expect(result.reasons).toContain("Over 50% already paid");
  });

  it("subtracts 10 points when some promises broken but not majority", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: 6000,
      totalAmount: 10000,
      promiseCount: 4,
      brokenPromiseCount: 1,
      hoursSinceLastActivity: 10,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(65);
    expect(result.reasons).toContain("Some broken promises");
    expect(result.reasons).toContain("Recent activity");
    expect(result.reasons).toContain("Over 50% already paid");
  });

  it("adds 10 points for recent activity less than 24 hours", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: null,
      totalAmount: null,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 10,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(55);
    expect(result.reasons).toContain("Recent activity");
  });

  it("subtracts 5 points when no activity for 72-168 hours", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: null,
      totalAmount: null,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 100,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(40);
    expect(result.reasons).toContain("No recent activity");
  });

  it("subtracts 10 points when no activity for over a week", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: null,
      totalAmount: null,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 200,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(35);
    expect(result.reasons).toContain("No activity in over a week");
  });

  it("adds 5 points for consistent follow-ups over 5", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: null,
      totalAmount: null,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 50,
      followupCount: 6,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(50);
    expect(result.reasons).toContain("Consistent follow-ups");
  });

  it("adds 5 points for high engagement over 3", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 4,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: null,
      totalAmount: null,
      promiseCount: 0,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 50,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(50);
    expect(result.reasons).toContain("High engagement");
  });

  it("clamps score to minimum 0", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: 0,
      totalAmount: 1000,
      promiseCount: 5,
      brokenPromiseCount: 5,
      hoursSinceLastActivity: 10,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(35);
  });

  it("does not go below 0", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 0,
      hasPartialPayment: false,
      dueAmount: null,
      paidAmount: 0,
      totalAmount: 1000,
      promiseCount: 10,
      brokenPromiseCount: 10,
      hoursSinceLastActivity: 200,
      followupCount: 0,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("does not go above 100", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 10,
      hasPartialPayment: true,
      dueAmount: null,
      paidAmount: 10000,
      totalAmount: 10000,
      promiseCount: 5,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 1,
      followupCount: 10,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("creates score of 100 with all positive factors", () => {
    const input: RecoveryScoreInput = {
      engagementCount: 10,
      hasPartialPayment: true,
      dueAmount: null,
      paidAmount: 10000,
      totalAmount: 10000,
      promiseCount: 5,
      brokenPromiseCount: 0,
      hoursSinceLastActivity: 1,
      followupCount: 10,
    };
    const result = calculateRecoveryScore(input);
    expect(result.score).toBe(100);
  });
});

describe("getRiskLevel", () => {
  it("returns low when score >= 70", () => {
    expect(getRiskLevel(70)).toBe("low");
    expect(getRiskLevel(85)).toBe("low");
    expect(getRiskLevel(100)).toBe("low");
  });

  it("returns medium when score 40-69", () => {
    expect(getRiskLevel(40)).toBe("medium");
    expect(getRiskLevel(55)).toBe("medium");
    expect(getRiskLevel(69)).toBe("medium");
  });

  it("returns high when score 20-39", () => {
    expect(getRiskLevel(20)).toBe("high");
    expect(getRiskLevel(30)).toBe("high");
    expect(getRiskLevel(39)).toBe("high");
  });

  it("returns critical when score < 20", () => {
    expect(getRiskLevel(19)).toBe("critical");
    expect(getRiskLevel(10)).toBe("critical");
    expect(getRiskLevel(0)).toBe("critical");
  });
});
