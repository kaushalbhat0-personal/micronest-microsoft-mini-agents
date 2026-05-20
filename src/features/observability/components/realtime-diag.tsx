"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getRecentLogs } from "@/shared/logger";

export function RealtimeDiag() {
  const logs = useMemo(() => getRecentLogs(500), []);

  const realtimeLogs = useMemo(() => logs.filter((l) => l.namespace === "realtime"), [logs]);

  const subscriptionCount = useMemo(() => {
    const subs = realtimeLogs.filter((l) => l.message.includes("subscribe") || l.message.includes("subscription"));
    return subs.length;
  }, [realtimeLogs]);

  const reconnectAttempts = useMemo(() => {
    return realtimeLogs.filter((l) => l.message.toLowerCase().includes("reconnect")).length;
  }, [realtimeLogs]);

  const duplicateEvents = useMemo(() => {
    return realtimeLogs.filter((l) => l.message.toLowerCase().includes("duplicate")).length;
  }, [realtimeLogs]);

  const staleChannels = useMemo(() => {
    return realtimeLogs.filter((l) => l.message.toLowerCase().includes("stale")).length;
  }, [realtimeLogs]);

  const latencyEntries = useMemo(() => {
    return realtimeLogs
      .filter((l) => l.data && typeof l.data === "object" && "latencyMs" in (l.data as Record<string, unknown>))
      .map((l) => (l.data as Record<string, unknown>).latencyMs as number);
  }, [realtimeLogs]);

  const avgLatency = useMemo(() => {
    if (latencyEntries.length === 0) return 0;
    return Math.round(latencyEntries.reduce((a, b) => a + b, 0) / latencyEntries.length);
  }, [latencyEntries]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono tracking-tight">Realtime Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Active Subscriptions</span>
          <span className="font-mono font-semibold">{subscriptionCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Reconnect Attempts</span>
          <span className={`font-mono font-semibold ${reconnectAttempts > 0 ? "text-destructive" : ""}`}>{reconnectAttempts}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Duplicate Events</span>
          <span className={`font-mono font-semibold ${duplicateEvents > 0 ? "text-destructive" : ""}`}>{duplicateEvents}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Stale Channels</span>
          <span className={`font-mono font-semibold ${staleChannels > 0 ? "text-destructive" : ""}`}>{staleChannels}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Avg Latency</span>
          <span className={`font-mono font-semibold ${avgLatency > 200 ? "text-destructive" : ""}`}>{avgLatency}ms</span>
        </div>
      </CardContent>
    </Card>
  );
}
