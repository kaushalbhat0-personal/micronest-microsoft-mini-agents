// Heartbeat configuration and constants

export const HEARTBEAT_INTERVAL_MS = 5000;
export const HEARTBEAT_STALE_MS = 30000;

export const STALE_THRESHOLD_MS = 30000;

export const PACING_CONFIG = {
  minDelayMs: 8000,
  maxDelayMs: 15000,
  cooldownAfterSends: 20,
  cooldownExtraDelayMs: 5000,
} as const;

export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 3000,
} as const;

export function isHeartbeatStale(lastHeartbeat: number): boolean {
  return Date.now() - lastHeartbeat > STALE_THRESHOLD_MS;
}
