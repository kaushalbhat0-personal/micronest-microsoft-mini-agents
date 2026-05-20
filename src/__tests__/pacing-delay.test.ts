import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PACING_CONFIG } from "@extension/shared/heartbeat";

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shouldCooldown(sendCount: number): boolean {
  return sendCount > 0 && sendCount % PACING_CONFIG.cooldownAfterSends === 0;
}

function getTotalDelay(sendCount: number): number {
  const base = getRandomDelay(PACING_CONFIG.minDelayMs, PACING_CONFIG.maxDelayMs);
  if (shouldCooldown(sendCount)) {
    return base + PACING_CONFIG.cooldownExtraDelayMs;
  }
  return base;
}

function createDelayCountdown(
  delayMs: number,
  onTick: (remaining: number) => void,
  intervalMs: number = 1000
): { clear: () => void; remaining: number } {
  let remaining = delayMs;
  const tick = () => {
    remaining = Math.max(0, remaining - intervalMs);
    onTick(remaining);
  };
  const id = setInterval(tick, intervalMs);
  return {
    clear: () => clearInterval(id),
    remaining,
  };
}

describe("pacing-delay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getRandomDelay", () => {
    it("returns value within minDelayMs..maxDelayMs range", () => {
      const min = PACING_CONFIG.minDelayMs;
      const max = PACING_CONFIG.maxDelayMs;
      for (let i = 0; i < 100; i++) {
        const delay = getRandomDelay(min, max);
        expect(delay).toBeGreaterThanOrEqual(min);
        expect(delay).toBeLessThanOrEqual(max);
      }
    });

    it("produces different values across multiple calls", () => {
      const min = PACING_CONFIG.minDelayMs;
      const max = PACING_CONFIG.maxDelayMs;
      const delays = new Set<number>();
      for (let i = 0; i < 50; i++) {
        delays.add(getRandomDelay(min, max));
      }
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe("shouldCooldown", () => {
    it("returns true when sendCount is a multiple of cooldownAfterSends (20)", () => {
      expect(shouldCooldown(20)).toBe(true);
      expect(shouldCooldown(40)).toBe(true);
      expect(shouldCooldown(60)).toBe(true);
    });

    it("returns false when sendCount is not a multiple of 20", () => {
      expect(shouldCooldown(1)).toBe(false);
      expect(shouldCooldown(19)).toBe(false);
      expect(shouldCooldown(21)).toBe(false);
      expect(shouldCooldown(39)).toBe(false);
    });

    it("returns false for sendCount of 0", () => {
      expect(shouldCooldown(0)).toBe(false);
    });
  });

  describe("getTotalDelay", () => {
    it("returns delay within base range when no cooldown", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const delay = getTotalDelay(1);
      expect(delay).toBeGreaterThanOrEqual(PACING_CONFIG.minDelayMs);
      expect(delay).toBeLessThanOrEqual(PACING_CONFIG.maxDelayMs);
    });

    it("adds cooldownExtraDelayMs when cooldown kicks in", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const baseMin = PACING_CONFIG.minDelayMs;
      const delay = getTotalDelay(20);
      expect(delay).toBe(baseMin + PACING_CONFIG.cooldownExtraDelayMs);
    });

    it("cooldownExtraDelayMs is 5000", () => {
      expect(PACING_CONFIG.cooldownExtraDelayMs).toBe(5000);
    });
  });

  describe("delay countdown", () => {
    it("broadcasts remaining time during countdown", () => {
      const ticks: number[] = [];
      const countdown = createDelayCountdown(5000, (remaining) => {
        ticks.push(remaining);
      }, 1000);

      vi.advanceTimersByTime(1000);
      expect(ticks).toContain(4000);

      vi.advanceTimersByTime(2000);
      expect(ticks).toContain(3000);
      expect(ticks).toContain(2000);

      countdown.clear();
    });
  });

  describe("pause/stop during delay", () => {
    it("stops countdown when state becomes paused", () => {
      const ticks: number[] = [];
      const countdown = createDelayCountdown(5000, (remaining) => {
        ticks.push(remaining);
        if (remaining <= 3000) {
          countdown.clear();
        }
      }, 1000);

      vi.advanceTimersByTime(1000);
      expect(ticks.length).toBe(1);

      vi.advanceTimersByTime(1000);
      expect(ticks.length).toBe(2);

      vi.advanceTimersByTime(5000);
      expect(ticks.length).toBe(2);

      countdown.clear();
    });

    it("prevents processNextContact when state is stopped during delay", () => {
      const processNextContact = vi.fn();
      let isStopped = false;

      const delayPromise = new Promise<void>((resolve) => {
        const delay = getRandomDelay(PACING_CONFIG.minDelayMs, PACING_CONFIG.maxDelayMs);
        setTimeout(() => {
          if (!isStopped) {
            processNextContact();
          }
          resolve();
        }, delay);
      });

      isStopped = true;
      vi.runAllTimers();

      expect(processNextContact).not.toHaveBeenCalled();
    });
  });

  describe("PACING_CONFIG constants", () => {
    it("minDelayMs is 8000", () => {
      expect(PACING_CONFIG.minDelayMs).toBe(8000);
    });

    it("maxDelayMs is 15000", () => {
      expect(PACING_CONFIG.maxDelayMs).toBe(15000);
    });

    it("cooldownAfterSends is 20", () => {
      expect(PACING_CONFIG.cooldownAfterSends).toBe(20);
    });
  });
});
