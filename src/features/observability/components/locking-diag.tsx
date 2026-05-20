"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getRecentLogs } from "@/shared/logger";

export function LockingDiag() {
  const logs = useMemo(() => getRecentLogs(500), []);

  const lockingLogs = useMemo(() => logs.filter((l) => l.namespace === "locking"), [logs]);

  const activeLocks = useMemo(() => {
    return lockingLogs.filter((l) => l.message.toLowerCase().includes("acquire") || l.message.toLowerCase().includes("lock acquired")).length;
  }, [lockingLogs]);

  const expiredLocks = useMemo(() => {
    return lockingLogs.filter((l) => l.message.toLowerCase().includes("expired") || l.message.toLowerCase().includes("expir")).length;
  }, [lockingLogs]);

  const lastCleanup = useMemo(() => {
    const cleanups = lockingLogs.filter((l) => l.message.toLowerCase().includes("cleanup"));
    if (cleanups.length === 0) return null;
    return new Date(cleanups[cleanups.length - 1].timestamp).toLocaleTimeString();
  }, [lockingLogs]);

  const heartbeats = useMemo(() => {
    return lockingLogs.filter((l) => l.message.toLowerCase().includes("heartbeat")).length;
  }, [lockingLogs]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono tracking-tight">Locking Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Active Locks</span>
          <span className="font-mono font-semibold">{activeLocks}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Expired Locks</span>
          <span className={`font-mono font-semibold ${expiredLocks > 0 ? "text-destructive" : ""}`}>{expiredLocks}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Last Cleanup</span>
          <span className="font-mono font-semibold">{lastCleanup ?? "N/A"}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Operator Heartbeats</span>
          <span className="font-mono font-semibold">{heartbeats}</span>
        </div>
      </CardContent>
    </Card>
  );
}
