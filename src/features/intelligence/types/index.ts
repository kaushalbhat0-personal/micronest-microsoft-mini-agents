export type AgingBucket = "fresh" | "aging" | "stale" | "critical";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type EscalationTrigger = "followup_ignored" | "sla_breach" | "promise_broken" | "repeated_failure" | "inactive_ownership";

export interface IntelligenceMetadata {
  slaDueAt?: string;
  escalationLevel: number;
  promiseDueAt?: string;
  lastPromiseBrokenAt?: string;
  recoveryScore: number;
  riskLevel: RiskLevel;
  agingBucket: AgingBucket;
  intelligenceScore: number;
  intelligenceReasons: string[];
}

export interface Recommendation {
  action: "contact_now" | "wait" | "escalate" | "reassign" | "resolve";
  score: number;
  reasons: string[];
  contactId: string;
  candidateId?: string;
}

export interface SlowingBucket {
  name: AgingBucket;
  minAgeHours: number;
  label: string;
  score: number;
}

export interface OperationalAlert {
  id: string;
  workspace_id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description?: string;
  contact_id?: string;
  candidate_id?: string;
  resolved: boolean;
  created_at: string;
}

export interface EscalationEvent {
  id: string;
  contact_id: string;
  workspace_id: string;
  previous_level: number;
  new_level: number;
  reason: string;
  triggered_by: EscalationTrigger;
  created_at: string;
}

export interface OperatorLoad {
  userId: string;
  assignedCount: number;
  activeSessions: number;
  overdueCount: number;
  slaBurden: number;
  totalScore: number;
}

export interface IntelligenceFeedItem {
  id: string;
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
  contactId?: string;
  operatorId?: string;
  timestamp: string;
}
