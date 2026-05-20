"use client";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { Recommendation } from "@/features/intelligence/types";

interface OperatorAssistProps {
  recommendation: Recommendation | null;
}

export function OperatorAssist({ recommendation }: OperatorAssistProps) {
  if (!recommendation) return null;
  const actionColor = recommendation.action === "contact_now" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
    recommendation.action === "escalate" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${actionColor}`}>
            {recommendation.action === "contact_now" ? "Contact Now" : recommendation.action === "escalate" ? "Escalate" : "Wait"}
          </span>
          <span className="text-lg font-mono font-bold">{recommendation.score}</span>
        </div>
        <ul className="space-y-0.5">
          {recommendation.reasons.map((r, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
              <span className="mt-0.5">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
