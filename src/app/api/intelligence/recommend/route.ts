import { NextRequest, NextResponse } from "next/server";
import { validateApiRouteAuth } from "@/lib/supabase/api-route";
import { getOperationalQueue } from "@/features/operations/services/get-operational-queue";
import { recommendNextContact } from "@/features/intelligence/services/recommend-next-contact";
import { calculateAgingBucket } from "@/features/intelligence/services/queue-aging";
import { detectSlaBreach } from "@/features/intelligence/services/detect-sla-breach";
import { shouldEscalate } from "@/features/intelligence/services/escalation";
import type { OperationalQueueItem } from "@/features/followups/types";
import type { RiskLevel } from "@/features/intelligence/types";

export async function GET(request: NextRequest) {
  const auth = await validateApiRouteAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  const queue = await getOperationalQueue(workspaceId);

  const recommendation = recommendNextContact(queue, (item: OperationalQueueItem) => {
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
  });

  return NextResponse.json({ recommendation, queueSize: queue.length });
}
