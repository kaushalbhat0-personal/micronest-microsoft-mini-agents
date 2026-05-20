interface TraceEntry {
  timestamp: number;
  type: string;
  direction: "sent" | "received";
  success: boolean;
  latencyMs?: number;
  payloadPreview?: string;
}

const MAX_TRACES = 200;
const traces: TraceEntry[] = [];

function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("micronest_debug_mode") === "true";
  } catch {
    return false;
  }
}

export function traceMessage(
  type: string,
  direction: "sent" | "received",
  success: boolean,
  latencyMs?: number,
  payload?: unknown
): void {
  if (!isDebugMode()) return;
  traces.push({
    timestamp: Date.now(),
    type,
    direction,
    success,
    latencyMs,
    payloadPreview:
      payload !== undefined
        ? JSON.stringify(payload).slice(0, 100)
        : undefined,
  });
  if (traces.length > MAX_TRACES) traces.shift();
}

export function getTraces(count = 50): TraceEntry[] {
  return traces.slice(-count);
}

export function clearTraces(): void {
  traces.length = 0;
}

export type { TraceEntry };
