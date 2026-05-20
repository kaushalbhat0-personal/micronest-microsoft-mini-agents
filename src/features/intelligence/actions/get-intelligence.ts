"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOperationalQueue } from "@/features/operations/services/get-operational-queue";
import { recommendNextContact, type ScoringInput } from "@/features/intelligence/services/recommend-next-contact";
import { prioritizeQueueV2 } from "@/features/intelligence/services/prioritize-queue-v2";
import { calculateAgingBucket } from "@/features/intelligence/services/queue-aging";
import { detectSlaBreach } from "@/features/intelligence/services/detect-sla-breach";
import { detectBrokenPromise } from "@/features/intelligence/services/detect-broken-promise";
import { shouldEscalate } from "@/features/intelligence/services/escalation";
import { createAlert, deduplicateAlerts } from "@/features/intelligence/services/operational-alerts";
import { buildFeedItem } from "@/features/intelligence/services/intelligence-feed";
import type { OperationalQueueItem } from "@/features/followups/types";
import type { Recommendation, RiskLevel, AgingBucket, OperationalAlert, IntelligenceFeedItem } from "@/features/intelligence/types";

export interface IntelligenceResult {
  recommendation: Recommendation | null;
  prioritizedItems: OperationalQueueItem[];
  alerts: OperationalAlert[];
  feedItems: IntelligenceFeedItem[];
  stats: {
    slaBreaches: number;
    brokenPromises: number;
    escalations: number;
    highRisk: number;
  };
}

function buildScoringInput(item: OperationalQueueItem): ScoringInput {
  const aging = calculateAgingBucket(item.candidate.generated_at);
  const sla = detectSlaBreach(item.contact);
  const escalation = shouldEscalate(
    item.contact.escalation_level ?? 0,
    sla.breached ? "sla_breach" : "followup_ignored",
    sla.breached ? 1 : 0
  );

  return {
    candidate: item.candidate,
    contact: item.contact,
    pledge: {
      slaDueAt: item.contact.sla_due_at ?? undefined,
      escalationLevel: escalation.escalate ? escalation.newLevel : (item.contact.escalation_level ?? 0),
      promiseDueAt: item.contact.promise_due_at ?? undefined,
      lastPromiseBrokenAt: item.contact.last_promise_broken_at ?? undefined,
      recoveryScore: item.contact.recovery_score ?? 50,
      riskLevel: (item.contact.risk_level ?? "low") as RiskLevel,
      agingBucket: aging.bucket,
    },
  };
}

export async function getIntelligence(workspaceId?: string | null): Promise<IntelligenceResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { recommendation: null, prioritizedItems: [], alerts: [], feedItems: [], stats: { slaBreaches: 0, brokenPromises: 0, escalations: 0, highRisk: 0 } };
  }

  const queue = await getOperationalQueue(workspaceId);

  const intelligenceMap = new Map<string, {
    slaDueAt?: string;
    escalationLevel: number;
    promiseDueAt?: string;
    recoveryScore: number;
    riskLevel: RiskLevel;
    agingBucket: AgingBucket;
    intelligenceScore: number;
  }>();

  const alerts: OperationalAlert[] = [];
  const feedItems: IntelligenceFeedItem[] = [];
  let slaBreaches = 0;
  let brokenPromises = 0;
  let escalations = 0;
  let highRisk = 0;

  for (const item of queue) {
    const aging = calculateAgingBucket(item.candidate.generated_at);
    const sla = detectSlaBreach(item.contact);
    const promise = detectBrokenPromise(item.contact);
    const riskLevel = (item.contact.risk_level ?? "low") as RiskLevel;

    if (sla.breached) {
      slaBreaches++;
      alerts.push(createAlert({
        workspaceId: workspaceId ?? "default",
        alertType: "sla_breach",
        severity: sla.level >= 2 ? "critical" : "warning",
        title: `SLA breached for ${item.contact.customer_name || "contact"}`,
        description: `Level ${sla.level} SLA breach`,
        contactId: item.contact.id,
        candidateId: item.candidate.id,
      }));
    }

    if (promise?.isBroken) {
      brokenPromises++;
      alerts.push(createAlert({
        workspaceId: workspaceId ?? "default",
        alertType: "promise_broken",
        severity: promise.daysOverdue >= 3 ? "critical" : "warning",
        title: `Promise broken by ${item.contact.customer_name || "contact"}`,
        description: `${promise.daysOverdue} day(s) overdue`,
        contactId: item.contact.id,
        candidateId: item.candidate.id,
      }));
    }

    if (riskLevel === "high" || riskLevel === "critical") highRisk++;

    const escalation = shouldEscalate(
      item.contact.escalation_level ?? 0,
      sla.breached ? "sla_breach" : "followup_ignored",
      sla.breached ? 1 : 0
    );
    if (escalation.escalate) escalations++;

    intelligenceMap.set(item.candidate.id, {
      slaDueAt: item.contact.sla_due_at ?? undefined,
      escalationLevel: escalation.escalate ? escalation.newLevel : (item.contact.escalation_level ?? 0),
      promiseDueAt: item.contact.promise_due_at ?? undefined,
      recoveryScore: item.contact.recovery_score ?? 50,
      riskLevel,
      agingBucket: aging.bucket,
      intelligenceScore: 0,
    });
  }

  const recommendation = recommendNextContact(queue, buildScoringInput);

  if (recommendation) {
    const feedItem = buildFeedItem({
      type: "recommendation",
      message: `${recommendation.action === "contact_now" ? "Contact" : recommendation.action === "escalate" ? "Escalate" : "Wait"}: ${recommendation.reasons[0] ?? "No reason"}`,
      severity: recommendation.score >= 50 ? "info" : "warning",
      contactId: recommendation.contactId,
    });
    feedItems.push(feedItem);
  }

  if (alerts.length > 0) {
    const dedupedAlerts = deduplicateAlerts(alerts);
    for (const alert of dedupedAlerts) {
      feedItems.push(buildFeedItem({
        type: "alert",
        message: alert.title,
        severity: alert.severity,
        contactId: alert.contact_id,
      }));
    }
  }

  const prioritizedItems = prioritizeQueueV2({ items: queue, intelligenceMap });

  return {
    recommendation,
    prioritizedItems,
    alerts: deduplicateAlerts(alerts),
    feedItems,
    stats: { slaBreaches, brokenPromises, escalations, highRisk },
  };
}
