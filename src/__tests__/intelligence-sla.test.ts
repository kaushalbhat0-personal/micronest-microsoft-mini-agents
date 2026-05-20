import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateSlaDueAt, getSlaWindowHours, getSlaStatus } from "@/features/intelligence/services/calculate-sla";
import { detectSlaBreach } from "@/features/intelligence/services/detect-sla-breach";
import type { Contact } from "@/features/followups/types";

describe("calculateSlaDueAt", () => {
  it("returns sla due at 4 hours after generatedAt for high priority", () => {
    const result = calculateSlaDueAt("high", "2026-01-15T10:00:00.000Z");
    expect(result).toBe("2026-01-15T14:00:00.000Z");
  });

  it("returns sla due at 24 hours after generatedAt for medium priority", () => {
    const result = calculateSlaDueAt("medium", "2026-01-15T10:00:00.000Z");
    expect(result).toBe("2026-01-16T10:00:00.000Z");
  });

  it("returns sla due at 72 hours after generatedAt for low priority", () => {
    const result = calculateSlaDueAt("low", "2026-01-15T10:00:00.000Z");
    expect(result).toBe("2026-01-18T10:00:00.000Z");
  });
});

describe("getSlaWindowHours", () => {
  it("returns 4 for high priority", () => {
    expect(getSlaWindowHours("high")).toBe(4);
  });

  it("returns 24 for medium priority", () => {
    expect(getSlaWindowHours("medium")).toBe(24);
  });

  it("returns 72 for low priority", () => {
    expect(getSlaWindowHours("low")).toBe(72);
  });
});

describe("getSlaStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ok for sla due in the future", () => {
    const futureSla = new Date("2026-01-15T14:00:00.000Z").toISOString();
    const result = getSlaStatus(futureSla);
    expect(result.status).toBe("ok");
    expect(result.remainingMs).toBeGreaterThan(0);
    expect(result.label).toBe("SLA OK");
  });

  it("returns warning when less than 1 hour remaining", () => {
    const nearSla = new Date("2026-01-15T12:30:00.000Z").toISOString();
    const result = getSlaStatus(nearSla);
    expect(result.status).toBe("warning");
    expect(result.remainingMs).toBeGreaterThan(0);
    expect(result.remainingMs).toBeLessThan(60 * 60 * 1000);
    expect(result.label).toBe("SLA At Risk");
  });

  it("returns breached when sla is past due", () => {
    const pastSla = new Date("2026-01-15T11:00:00.000Z").toISOString();
    const result = getSlaStatus(pastSla);
    expect(result.status).toBe("breached");
    expect(result.remainingMs).toBeLessThan(0);
    expect(result.label).toBe("SLA Breached");
  });
});

describe("detectSlaBreach", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns breached=false when sla_due_at is missing", () => {
    const contact = { id: "c1" } as Contact;
    expect(detectSlaBreach(contact)).toEqual({ breached: false, level: 0 });
  });

  it("returns breached=false when sla is not yet due", () => {
    const contact = { id: "c1", sla_due_at: "2026-01-15T14:00:00.000Z" } as Contact;
    expect(detectSlaBreach(contact)).toEqual({ breached: false, level: 0 });
  });

  it("returns level 1 when overdue by less than 24 hours", () => {
    const contact = { id: "c1", sla_due_at: "2026-01-15T10:00:00.000Z" } as Contact;
    const result = detectSlaBreach(contact);
    expect(result.breached).toBe(true);
    expect(result.level).toBe(1);
  });

  it("returns level 2 when overdue by 24-72 hours", () => {
    const contact = { id: "c1", sla_due_at: "2026-01-14T08:00:00.000Z" } as Contact;
    const result = detectSlaBreach(contact);
    expect(result.breached).toBe(true);
    expect(result.level).toBe(2);
  });

  it("returns level 3 when overdue by more than 72 hours", () => {
    const contact = { id: "c1", sla_due_at: "2026-01-11T10:00:00.000Z" } as Contact;
    const result = detectSlaBreach(contact);
    expect(result.breached).toBe(true);
    expect(result.level).toBe(3);
  });
});
