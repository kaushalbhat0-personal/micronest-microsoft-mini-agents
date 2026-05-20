"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { getRecentLogs } from "@/shared/logger";
import { getAllFlags, toggleFlag, type FeatureFlag } from "@/shared/flags";
import { isDebugMode } from "@/shared/debug";
import { RealtimeDiag } from "@/features/observability/components/realtime-diag";
import { LockingDiag } from "@/features/observability/components/locking-diag";
import { IntelligenceCard } from "@/features/intelligence/components/IntelligenceCard";

export default function HealthPage() {
  const logs = useMemo(() => getRecentLogs(1000), []);
  const allFlags = useMemo(() => getAllFlags(), []);
  const debug = useMemo(() => isDebugMode(), []);

  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>(allFlags);
  const [oneHourAgo] = useState(() => Date.now() - 60 * 60 * 1000);

  const runtimeFailures = useMemo(() => logs.filter((l) => l.namespace === "runtime" && l.level === "error").length, [logs]);
  const failuresLastHour = useMemo(() => {
    return logs.filter((l) => l.namespace === "runtime" && l.level === "error" && l.timestamp >= oneHourAgo).length;
  }, [logs, oneHourAgo]);
  const totalLogs = logs.length;
  const failureRate = totalLogs > 0 ? ((runtimeFailures / totalLogs) * 100).toFixed(1) : "0.0";

  const retryLogs = useMemo(() => logs.filter((l) => l.message.toLowerCase().includes("retry")), [logs]);
  const retry1 = retryLogs.filter((l) => l.data && (l.data as Record<string, unknown>)?.count === 1).length;
  const retry2 = retryLogs.filter((l) => l.data && (l.data as Record<string, unknown>)?.count === 2).length;
  const retry3plus = retryLogs.length - retry1 - retry2;

  const extensionDisconnects = useMemo(() => logs.filter((l) => l.namespace === "extension" && l.message.toLowerCase().includes("disconnect")).length, [logs]);

  const queueLogs = useMemo(() => logs.filter((l) => l.namespace === "queue"), [logs]);
  const queueProcessingTime = useMemo(() => {
    const timing = queueLogs.filter((l) => l.data && typeof l.data === "object" && "processingMs" in (l.data as Record<string, unknown>));
    if (timing.length === 0) return 0;
    const sum = timing.reduce((a, l) => a + ((l.data as Record<string, unknown>).processingMs as number), 0);
    return Math.round(sum / timing.length);
  }, [queueLogs]);
  const queueItemsWaiting = useMemo(() => {
    const waiting = queueLogs.filter((l) => l.message.toLowerCase().includes("waiting"));
    return waiting.length;
  }, [queueLogs]);

  const realtimeReconnects = useMemo(() => logs.filter((l) => l.namespace === "realtime" && l.message.toLowerCase().includes("reconnect")).length, [logs]);

  const failedSessions = useMemo(() => logs.filter((l) => l.namespace === "recovery" && l.level === "error" && l.message.toLowerCase().includes("session")).length, [logs]);

  const staleLockCount = useMemo(() => logs.filter((l) => l.namespace === "locking" && (l.message.toLowerCase().includes("expired") || l.message.toLowerCase().includes("stale"))).length, [logs]);
  const lastCleanup = useMemo(() => {
    const cleanups = logs.filter((l) => l.namespace === "locking" && l.message.toLowerCase().includes("cleanup"));
    if (cleanups.length === 0) return "N/A";
    return new Date(cleanups[cleanups.length - 1].timestamp).toLocaleTimeString();
  }, [logs]);

  function handleToggle(flag: FeatureFlag) {
    toggleFlag(flag);
    setFlags(getAllFlags());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Health</h1>
          <p className="text-muted-foreground text-sm">Internal operational health dashboard</p>
        </div>
        {debug && <Badge variant="destructive">DEBUG</Badge>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-tight">Runtime Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className={`font-mono font-semibold ${runtimeFailures > 0 ? "text-destructive" : ""}`}>{runtimeFailures}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Hour</span>
                <span className={`font-mono font-semibold ${failuresLastHour > 0 ? "text-destructive" : ""}`}>{failuresLastHour}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Failure Rate</span>
                <span className={`font-mono font-semibold ${Number(failureRate) > 5 ? "text-destructive" : ""}`}>{failureRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-tight">Retry Spikes (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">1 Retry</span>
                <span className="font-mono font-semibold">{retry1}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">2 Retries</span>
                <span className="font-mono font-semibold">{retry2}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">3+ Retries</span>
                <span className={`font-mono font-semibold ${retry3plus > 0 ? "text-destructive" : ""}`}>{retry3plus}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-tight">Stale Locks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Expired Locks</span>
                <span className={`font-mono font-semibold ${staleLockCount > 0 ? "text-destructive" : ""}`}>{staleLockCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Cleanup</span>
                <span className="font-mono font-semibold">{lastCleanup}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-tight">Extension Disconnects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-mono font-semibold text-lg ${extensionDisconnects > 0 ? "text-destructive" : ""}`}>{extensionDisconnects}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-tight">Queue Lag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg Processing</span>
                <span className={`font-mono font-semibold ${queueProcessingTime > 5000 ? "text-destructive" : ""}`}>{queueProcessingTime}ms</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Items Waiting</span>
                <span className={`font-mono font-semibold ${queueItemsWaiting > 0 ? "text-destructive" : ""}`}>{queueItemsWaiting}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-tight">Realtime Reconnects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-mono font-semibold text-lg ${realtimeReconnects > 0 ? "text-destructive" : ""}`}>{realtimeReconnects}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono tracking-tight">Failed Sequential Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-mono font-semibold text-lg ${failedSessions > 0 ? "text-destructive" : ""}`}>{failedSessions}</p>
          </CardContent>
        </Card>

        <IntelligenceCard />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RealtimeDiag />
        <LockingDiag />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono tracking-tight">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(flags) as FeatureFlag[]).map((flag) => (
              <Button
                key={flag}
                variant={flags[flag] ? "default" : "outline"}
                size="sm"
                className="text-xs font-mono h-7"
                onClick={() => handleToggle(flag)}
              >
                {flag}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
