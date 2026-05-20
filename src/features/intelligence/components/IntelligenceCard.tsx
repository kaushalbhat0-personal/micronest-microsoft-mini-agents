"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getIntelligence } from "@/features/intelligence/actions/get-intelligence";
import type { IntelligenceResult } from "@/features/intelligence/actions/get-intelligence";

export function IntelligenceCard() {
  const [data, setData] = useState<IntelligenceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getIntelligence().then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono tracking-tight">Intelligence Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono tracking-tight">Intelligence Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">SLA Breaches</span>
            <span className={`font-mono font-semibold ${data.stats.slaBreaches > 0 ? "text-destructive" : ""}`}>{data.stats.slaBreaches}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Broken Promises</span>
            <span className={`font-mono font-semibold ${data.stats.brokenPromises > 0 ? "text-destructive" : ""}`}>{data.stats.brokenPromises}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Escalations</span>
            <span className={`font-mono font-semibold ${data.stats.escalations > 0 ? "text-destructive" : ""}`}>{data.stats.escalations}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">High Risk Contacts</span>
            <span className={`font-mono font-semibold ${data.stats.highRisk > 0 ? "text-destructive" : ""}`}>{data.stats.highRisk}</span>
          </div>
          {data.recommendation && (
            <div className="pt-2 border-t mt-2">
              <p className="text-[10px] text-muted-foreground mb-1">Top Recommendation</p>
              <p className="text-xs font-semibold">{data.recommendation.action} ({data.recommendation.score})</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
