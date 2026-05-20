import type { OperationalAlert } from "@/features/intelligence/types";

export function createAlert(params: {
  workspaceId: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description?: string;
  contactId?: string;
  candidateId?: string;
}): OperationalAlert {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    workspace_id: params.workspaceId,
    alert_type: params.alertType,
    severity: params.severity,
    title: params.title,
    description: params.description,
    contact_id: params.contactId,
    candidate_id: params.candidateId,
    resolved: false,
    created_at: new Date().toISOString(),
  };
}

export function deduplicateAlerts(alerts: OperationalAlert[]): OperationalAlert[] {
  const seen = new Set<string>();
  return alerts.filter((a) => {
    const key = `${a.alert_type}:${a.contact_id ?? "global"}:${a.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getAlertSeverity(alert: OperationalAlert): number {
  const severityMap: Record<string, number> = { info: 0, warning: 1, critical: 2 };
  return severityMap[alert.severity] ?? 0;
}
