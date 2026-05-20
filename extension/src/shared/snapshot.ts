import type { SendFailure } from "./failure-types";
import type { PersistedSession } from "./storage";

interface DiagnosticSnapshot {
  id: string;
  timestamp: number;
  session?: {
    id: string;
    state: string;
    currentIndex: number;
    totalCount: number;
    counters: { sent: number; skipped: number; failed: number; retries: number };
  };
  failures: SendFailure[];
  recentRuntimeEvents: Array<{ timestamp: number; level: string; namespace: string; message: string }>;
  extensionHealth: {
    hasWhatsAppTab: boolean;
    hasActiveSession: boolean;
    uptime: number;
  };
  lockState?: unknown;
}

const SNAPSHOT_KEY = "micronest_diagnostic_snapshots";
const MAX_SNAPSHOTS = 10;

export function captureSnapshot(
  session?: PersistedSession,
  failures?: SendFailure[],
  recentEvents?: Array<{ timestamp: number; level: string; namespace: string; message: string }>,
  hasWhatsAppTab?: boolean,
): DiagnosticSnapshot {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    session: session ? {
      id: session.id,
      state: session.state,
      currentIndex: session.currentIndex,
      totalCount: session.contacts.length,
      counters: { ...session.counters },
    } : undefined,
    failures: failures ?? [],
    recentRuntimeEvents: (recentEvents ?? []).slice(-20),
    extensionHealth: {
      hasWhatsAppTab: hasWhatsAppTab ?? false,
      hasActiveSession: !!session,
      uptime: performance.now(),
    },
  };
}

export async function storeSnapshot(snapshot: DiagnosticSnapshot): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  try {
    const existing = await chrome.storage.local.get(SNAPSHOT_KEY);
    const snapshots: DiagnosticSnapshot[] = (existing[SNAPSHOT_KEY] as DiagnosticSnapshot[]) ?? [];
    snapshots.push(snapshot);
    const trimmed = snapshots.slice(-MAX_SNAPSHOTS);
    await chrome.storage.local.set({ [SNAPSHOT_KEY]: trimmed });
  } catch {
    // best effort
  }
}

export async function loadSnapshots(): Promise<DiagnosticSnapshot[]> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
  try {
    const result = await chrome.storage.local.get(SNAPSHOT_KEY);
    return (result[SNAPSHOT_KEY] as DiagnosticSnapshot[]) ?? [];
  } catch {
    return [];
  }
}

export async function clearSnapshots(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  try {
    await chrome.storage.local.remove(SNAPSHOT_KEY);
  } catch {
    // best effort
  }
}
