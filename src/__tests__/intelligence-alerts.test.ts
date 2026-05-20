import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAlert, deduplicateAlerts, getAlertSeverity } from "@/features/intelligence/services/operational-alerts";
import type { OperationalAlert } from "@/features/intelligence/types";

describe("createAlert", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    vi.spyOn(crypto, "randomUUID").mockReturnValue("mock-uuid-123");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds alert with all required fields", () => {
    const result = createAlert({
      workspaceId: "ws-1",
      alertType: "sla_breach",
      severity: "critical",
      title: "SLA Breached for contact",
      description: "Contact is 2 hours overdue",
      contactId: "contact-1",
      candidateId: "cand-1",
    });
    expect(result).toEqual({
      id: "mock-uuid-123",
      workspace_id: "ws-1",
      alert_type: "sla_breach",
      severity: "critical",
      title: "SLA Breached for contact",
      description: "Contact is 2 hours overdue",
      contact_id: "contact-1",
      candidate_id: "cand-1",
      resolved: false,
      created_at: "2026-01-15T12:00:00.000Z",
    });
  });

  it("builds alert without optional fields", () => {
    const result = createAlert({
      workspaceId: "ws-1",
      alertType: "info",
      severity: "info",
      title: "Info alert",
    });
    expect(result.workspace_id).toBe("ws-1");
    expect(result.alert_type).toBe("info");
    expect(result.severity).toBe("info");
    expect(result.title).toBe("Info alert");
    expect(result.description).toBeUndefined();
    expect(result.contact_id).toBeUndefined();
    expect(result.candidate_id).toBeUndefined();
    expect(result.resolved).toBe(false);
  });
});

describe("deduplicateAlerts", () => {
  it("removes duplicates by type+contactId+title", () => {
    const alerts: OperationalAlert[] = [
      { id: "1", workspace_id: "ws-1", alert_type: "sla_breach", severity: "critical", title: "SLA Breach", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
      { id: "2", workspace_id: "ws-1", alert_type: "sla_breach", severity: "critical", title: "SLA Breach", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
      { id: "3", workspace_id: "ws-1", alert_type: "sla_breach", severity: "warning", title: "SLA Breach Resolved", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
    ];
    const result = deduplicateAlerts(alerts);
    expect(result).toHaveLength(2);
  });

  it("keeps alerts with different types", () => {
    const alerts: OperationalAlert[] = [
      { id: "1", workspace_id: "ws-1", alert_type: "sla_breach", severity: "critical", title: "SLA Breach", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
      { id: "2", workspace_id: "ws-1", alert_type: "promise_breach", severity: "warning", title: "SLA Breach", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
    ];
    const result = deduplicateAlerts(alerts);
    expect(result).toHaveLength(2);
  });

  it("keeps alerts with different contactIds", () => {
    const alerts: OperationalAlert[] = [
      { id: "1", workspace_id: "ws-1", alert_type: "sla_breach", severity: "critical", title: "SLA Breach", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
      { id: "2", workspace_id: "ws-1", alert_type: "sla_breach", severity: "critical", title: "SLA Breach", contact_id: "c2", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
    ];
    const result = deduplicateAlerts(alerts);
    expect(result).toHaveLength(2);
  });

  it("keeps alerts with different titles", () => {
    const alerts: OperationalAlert[] = [
      { id: "1", workspace_id: "ws-1", alert_type: "sla_breach", severity: "critical", title: "SLA Breach", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
      { id: "2", workspace_id: "ws-1", alert_type: "sla_breach", severity: "critical", title: "SLA Breach Resolved", contact_id: "c1", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
    ];
    const result = deduplicateAlerts(alerts);
    expect(result).toHaveLength(2);
  });

  it("handles global alerts without contact_id", () => {
    const alerts: OperationalAlert[] = [
      { id: "1", workspace_id: "ws-1", alert_type: "system", severity: "info", title: "System Alert", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
      { id: "2", workspace_id: "ws-1", alert_type: "system", severity: "info", title: "System Alert", resolved: false, created_at: "2026-01-15T12:00:00.000Z" },
    ];
    const result = deduplicateAlerts(alerts);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateAlerts([])).toEqual([]);
  });
});

describe("getAlertSeverity", () => {
  it("returns 0 for info", () => {
    const alert: OperationalAlert = { id: "1", workspace_id: "ws-1", alert_type: "info", severity: "info", title: "Info", resolved: false, created_at: "" };
    expect(getAlertSeverity(alert)).toBe(0);
  });

  it("returns 1 for warning", () => {
    const alert: OperationalAlert = { id: "1", workspace_id: "ws-1", alert_type: "warning", severity: "warning", title: "Warning", resolved: false, created_at: "" };
    expect(getAlertSeverity(alert)).toBe(1);
  });

  it("returns 2 for critical", () => {
    const alert: OperationalAlert = { id: "1", workspace_id: "ws-1", alert_type: "critical", severity: "critical", title: "Critical", resolved: false, created_at: "" };
    expect(getAlertSeverity(alert)).toBe(2);
  });
});
