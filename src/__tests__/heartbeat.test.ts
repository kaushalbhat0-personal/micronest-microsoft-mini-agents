import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isHeartbeatStale,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_STALE_MS,
  STALE_THRESHOLD_MS,
  PACING_CONFIG,
  RETRY_CONFIG,
} from "@extension/shared/heartbeat";

describe("heartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constants", () => {
    it("heartbeat interval is 5000ms", () => {
      expect(HEARTBEAT_INTERVAL_MS).toBe(5000);
    });

    it("stale threshold is 30000ms", () => {
      expect(HEARTBEAT_STALE_MS).toBe(30000);
      expect(STALE_THRESHOLD_MS).toBe(30000);
    });

    it("pacing config has correct defaults", () => {
      expect(PACING_CONFIG.minDelayMs).toBe(8000);
      expect(PACING_CONFIG.maxDelayMs).toBe(15000);
      expect(PACING_CONFIG.cooldownAfterSends).toBe(20);
      expect(PACING_CONFIG.cooldownExtraDelayMs).toBe(5000);
    });

    it("retry config has correct defaults", () => {
      expect(RETRY_CONFIG.maxRetries).toBe(3);
      expect(RETRY_CONFIG.retryDelayMs).toBe(3000);
    });
  });

  describe("isHeartbeatStale", () => {
    it("returns true when heartbeat is older than threshold", () => {
      const oldHeartbeat = Date.now() - 60000;
      expect(isHeartbeatStale(oldHeartbeat)).toBe(true);
    });

    it("returns false when heartbeat is recent", () => {
      const recentHeartbeat = Date.now() - 5000;
      expect(isHeartbeatStale(recentHeartbeat)).toBe(false);
    });

    it("returns false at exactly threshold boundary", () => {
      const boundary = Date.now() - STALE_THRESHOLD_MS;
      expect(isHeartbeatStale(boundary)).toBe(false);
    });

    it("returns true when just past threshold", () => {
      const justPast = Date.now() - STALE_THRESHOLD_MS - 1;
      expect(isHeartbeatStale(justPast)).toBe(true);
    });
  });
});
