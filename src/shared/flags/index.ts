export type FeatureFlag =
  | "runtimeInspector"
  | "overlayDiagnostics"
  | "verboseRealtimeLogs"
  | "queueProfiler"
  | "extensionTracing"
  | "failureSnapshots"
  | "transitionTimeline"
  | "replayFoundation";

const FLAG_STORAGE_KEY = "micronest_feature_flags";

const defaultFlags: Record<FeatureFlag, boolean> = {
  runtimeInspector: false,
  overlayDiagnostics: false,
  verboseRealtimeLogs: false,
  queueProfiler: false,
  extensionTracing: false,
  failureSnapshots: false,
  transitionTimeline: false,
  replayFoundation: false,
};

function getStoredFlags(): Record<FeatureFlag, boolean> {
  if (typeof window === "undefined") return { ...defaultFlags };
  try {
    const raw = localStorage.getItem(FLAG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<FeatureFlag, boolean>>;
      return { ...defaultFlags, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...defaultFlags };
}

function persistFlags(flags: Record<FeatureFlag, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FLAG_STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // ignore
  }
}

let flags = getStoredFlags();

export function isFlagEnabled(flag: FeatureFlag): boolean {
  return flags[flag] ?? false;
}

export function enableFlag(flag: FeatureFlag): void {
  flags[flag] = true;
  persistFlags(flags);
}

export function disableFlag(flag: FeatureFlag): void {
  flags[flag] = false;
  persistFlags(flags);
}

export function toggleFlag(flag: FeatureFlag): boolean {
  const next = !flags[flag];
  if (next) enableFlag(flag);
  else disableFlag(flag);
  return next;
}

export function resetFlags(): void {
  flags = { ...defaultFlags };
  persistFlags(flags);
}

export function getAllFlags(): Record<FeatureFlag, boolean> {
  return { ...flags };
}
