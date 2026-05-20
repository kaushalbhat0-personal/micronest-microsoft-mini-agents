import { describe, it, expect } from "vitest";
import type { PersistedSession } from "@extension/shared/storage";
import { buildPersistedSession } from "./factories";

type SessionState = PersistedSession["state"];

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  queued: ["sending"],
  sending: ["paused", "completed", "stopped", "failed"],
  paused: ["sending", "stopped"],
  completed: [],
  stopped: [],
  failed: ["paused"],
};

const TERMINAL_STATES: SessionState[] = ["completed", "stopped"];

function canTransitionState(current: SessionState, next: SessionState): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

function transitionSession(
  session: PersistedSession,
  newState: SessionState
): PersistedSession | null {
  if (!canTransitionState(session.state, newState)) return null;
  return { ...session, state: newState, updatedAt: Date.now() };
}

function incrementCounter(
  session: PersistedSession,
  counterType: "sent" | "failed" | "skipped"
): PersistedSession {
  return {
    ...session,
    counters: {
      ...session.counters,
      [counterType]: session.counters[counterType] + 1,
    },
    updatedAt: Date.now(),
  };
}

function buildSession(overrides: Partial<PersistedSession> = {}): PersistedSession {
  return buildPersistedSession(overrides);
}

describe("session-lifecycle", () => {
  describe("canTransitionState", () => {
    it("allows queued to sending", () => {
      expect(canTransitionState("queued", "sending")).toBe(true);
    });

    it("allows sending to paused", () => {
      expect(canTransitionState("sending", "paused")).toBe(true);
    });

    it("allows paused to sending", () => {
      expect(canTransitionState("paused", "sending")).toBe(true);
    });

    it("allows sending to completed", () => {
      expect(canTransitionState("sending", "completed")).toBe(true);
    });

    it("allows sending to stopped", () => {
      expect(canTransitionState("sending", "stopped")).toBe(true);
    });

    it("allows sending to failed", () => {
      expect(canTransitionState("sending", "failed")).toBe(true);
    });

    it("allows paused to stopped", () => {
      expect(canTransitionState("paused", "stopped")).toBe(true);
    });

    it("prevents paused to completed", () => {
      expect(canTransitionState("paused", "completed")).toBe(false);
    });

    it("prevents transitions from completed terminal state", () => {
      const states: SessionState[] = ["queued", "sending", "paused", "completed", "stopped", "failed"];
      for (const s of states) {
        expect(canTransitionState("completed", s)).toBe(false);
      }
    });

    it("prevents transitions from stopped terminal state", () => {
      const states: SessionState[] = ["queued", "sending", "paused", "completed", "stopped", "failed"];
      for (const s of states) {
        expect(canTransitionState("stopped", s)).toBe(false);
      }
    });

    it("allows failed to paused", () => {
      expect(canTransitionState("failed", "paused")).toBe(true);
    });
  });

  describe("transitionSession", () => {
    it("transitions queued to sending", () => {
      const session = buildSession({ state: "queued" });
      const result = transitionSession(session, "sending");
      expect(result).not.toBeNull();
      expect(result!.state).toBe("sending");
    });

    it("returns null for invalid transition", () => {
      const session = buildSession({ state: "queued" });
      const result = transitionSession(session, "completed");
      expect(result).toBeNull();
    });

    it("returns null for terminal state transitions", () => {
      for (const terminal of TERMINAL_STATES) {
        const session = buildSession({ state: terminal });
        const result = transitionSession(session, "sending");
        expect(result).toBeNull();
      }
    });

    it("transitions failed to paused", () => {
      const session = buildSession({ state: "failed" });
      const result = transitionSession(session, "paused");
      expect(result).not.toBeNull();
      expect(result!.state).toBe("paused");
    });

    it("does not affect original session object", () => {
      const session = buildSession({ state: "queued" });
      const originalState = session.state;
      transitionSession(session, "sending");
      expect(session.state).toBe(originalState);
    });
  });

  describe("counter tracking", () => {
    it("increments sent counter", () => {
      const session = buildSession({ counters: { sent: 0, skipped: 0, failed: 0, retries: 0 } });
      const result = incrementCounter(session, "sent");
      expect(result.counters.sent).toBe(1);
      expect(result.counters.failed).toBe(0);
      expect(result.counters.skipped).toBe(0);
    });

    it("increments failed counter", () => {
      const session = buildSession({ counters: { sent: 5, skipped: 2, failed: 1, retries: 0 } });
      const result = incrementCounter(session, "failed");
      expect(result.counters.failed).toBe(2);
      expect(result.counters.sent).toBe(5);
    });

    it("increments skipped counter", () => {
      const session = buildSession({ counters: { sent: 3, skipped: 0, failed: 1, retries: 0 } });
      const result = incrementCounter(session, "skipped");
      expect(result.counters.skipped).toBe(1);
    });

    it("does not mutate original session", () => {
      const session = buildSession({ counters: { sent: 0, skipped: 0, failed: 0, retries: 0 } });
      incrementCounter(session, "sent");
      expect(session.counters.sent).toBe(0);
    });
  });

  describe("multiple pause/resume cycles", () => {
    it("allows multiple pause/resume cycles", () => {
      let session = buildSession({ state: "sending" });

      for (let i = 0; i < 3; i++) {
        const paused = transitionSession(session, "paused");
        expect(paused).not.toBeNull();
        session = paused!;

        const resumed = transitionSession(session, "sending");
        expect(resumed).not.toBeNull();
        session = resumed!;
      }

      expect(session.state).toBe("sending");
    });

    it("tracks counters correctly through multiple cycles", () => {
      let session = buildSession({
        state: "sending",
        counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
      });

      session = transitionSession(session, "paused")!;
      session = transitionSession(session, "sending")!;
      session = incrementCounter(session, "sent");
      session = incrementCounter(session, "sent");

      session = transitionSession(session, "paused")!;
      session = transitionSession(session, "sending")!;
      session = incrementCounter(session, "sent");

      expect(session.counters.sent).toBe(3);
      expect(session.state).toBe("sending");
    });
  });
});
