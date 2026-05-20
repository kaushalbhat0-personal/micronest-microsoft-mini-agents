import { describe, it, expect } from "vitest";
import { shouldEscalate, getEscalationLabel, MAX_ESCALATION_LEVEL } from "@/features/intelligence/services/escalation";
import type { EscalationTrigger } from "@/features/intelligence/types";

describe("shouldEscalate", () => {
  it("returns escalate=false when already at MAX_ESCALATION_LEVEL", () => {
    const result = shouldEscalate(MAX_ESCALATION_LEVEL, "sla_breach", 1);
    expect(result.escalate).toBe(false);
    expect(result.newLevel).toBe(MAX_ESCALATION_LEVEL);
    expect(result.reason).toBe("Already at max escalation");
  });

  it("escalates +2 for sla_breach", () => {
    const result = shouldEscalate(0, "sla_breach", 1);
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.reason).toBe("SLA deadline breached");
  });

  it("caps sla_breach escalation at MAX_ESCALATION_LEVEL", () => {
    const result = shouldEscalate(4, "sla_breach", 1);
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(MAX_ESCALATION_LEVEL);
  });

  it("escalates +1 for promise_broken", () => {
    const result = shouldEscalate(0, "promise_broken", 1);
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(1);
    expect(result.reason).toBe("Promise was broken");
  });

  it("escalates +1 for followup_ignored when triggerCount >= 3", () => {
    const result = shouldEscalate(0, "followup_ignored", 3);
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(1);
    expect(result.reason).toBe("Repeated follow-ups ignored");
  });

  it("does not escalate for followup_ignored when triggerCount < 3", () => {
    const result = shouldEscalate(0, "followup_ignored", 2);
    expect(result.escalate).toBe(false);
    expect(result.newLevel).toBe(0);
  });

  it("escalates +2 for repeated_failure when triggerCount >= 3", () => {
    const result = shouldEscalate(0, "repeated_failure", 3);
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.reason).toBe("Repeated delivery failures");
  });

  it("does not escalate for repeated_failure when triggerCount < 3", () => {
    const result = shouldEscalate(0, "repeated_failure", 2);
    expect(result.escalate).toBe(false);
    expect(result.newLevel).toBe(0);
  });

  it("escalates +1 for inactive_ownership when triggerCount >= 1", () => {
    const result = shouldEscalate(0, "inactive_ownership", 1);
    expect(result.escalate).toBe(true);
    expect(result.newLevel).toBe(1);
    expect(result.reason).toBe("No activity from assigned operator");
  });

  it("does not escalate for inactive_ownership when triggerCount is 0", () => {
    const result = shouldEscalate(0, "inactive_ownership", 0);
    expect(result.escalate).toBe(false);
    expect(result.newLevel).toBe(0);
  });
});

describe("getEscalationLabel", () => {
  it("returns Normal for level 0", () => {
    expect(getEscalationLabel(0)).toBe("Normal");
  });

  it("returns Monitoring for levels 1-2", () => {
    expect(getEscalationLabel(1)).toBe("Monitoring");
    expect(getEscalationLabel(2)).toBe("Monitoring");
  });

  it("returns Elevated for levels 3-4", () => {
    expect(getEscalationLabel(3)).toBe("Elevated");
    expect(getEscalationLabel(4)).toBe("Elevated");
  });

  it("returns Critical for level 5", () => {
    expect(getEscalationLabel(5)).toBe("Critical");
  });
});
