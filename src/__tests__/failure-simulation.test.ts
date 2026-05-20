import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyFailure,
  isRetryable,
  FailureCategory,
  MAX_RETRIES,
} from "@extension/shared/failure-types";
import { RETRY_CONFIG } from "@extension/shared/heartbeat";
import type { SendFailure } from "@extension/shared/failure-types";

interface FailureSimulationState {
  retriesUsed: number;
  consecutiveItemFailures: number;
  isPaused: boolean;
  failures: string[];
  escalated: boolean;
}

function createInitialSimulationState(): FailureSimulationState {
  return { retriesUsed: 0, consecutiveItemFailures: 0, isPaused: false, failures: [], escalated: false };
}

const ESCALATION_THRESHOLD = 3;

function processItem(
  failure: SendFailure,
  state: FailureSimulationState
): {
  outcome: "retried" | "failed" | "escalated";
  newState: FailureSimulationState;
} {
  if (!failure.retryable) {
    const newConsecutive = state.consecutiveItemFailures + 1;
    const shouldEscalate = newConsecutive >= ESCALATION_THRESHOLD;
    return {
      outcome: shouldEscalate ? "escalated" : "failed",
      newState: {
        ...state,
        consecutiveItemFailures: shouldEscalate ? ESCALATION_THRESHOLD : newConsecutive,
        isPaused: shouldEscalate,
        escalated: shouldEscalate,
        failures: [...state.failures, failure.category],
      },
    };
  }

  if (state.retriesUsed >= MAX_RETRIES) {
    const newConsecutive = state.consecutiveItemFailures + 1;
    const shouldEscalate = newConsecutive >= ESCALATION_THRESHOLD;
    return {
      outcome: shouldEscalate ? "escalated" : "failed",
      newState: {
        ...state,
        consecutiveItemFailures: shouldEscalate ? ESCALATION_THRESHOLD : newConsecutive,
        isPaused: shouldEscalate,
        escalated: shouldEscalate,
        failures: [...state.failures, failure.category],
      },
    };
  }

  return {
    outcome: "retried",
    newState: {
      ...state,
      retriesUsed: state.retriesUsed + 1,
      consecutiveItemFailures: 0,
      failures: [...state.failures, failure.category],
    },
  };
}

function simulateBatch(
  failures: SendFailure[],
  initialState: FailureSimulationState
): { outcomes: string[]; finalState: FailureSimulationState } {
  let state = { ...initialState };
  const outcomes: string[] = [];

  for (const failure of failures) {
    if (state.isPaused) {
      outcomes.push("skipped_paused");
      continue;
    }
    const result = processItem(failure, state);
    outcomes.push(result.outcome);
    state = result.newState;
  }

  return { outcomes, finalState: state };
}

function canAttemptRecovery(state: FailureSimulationState): boolean {
  return state.isPaused;
}

function recoverSession(state: FailureSimulationState): FailureSimulationState {
  return { ...state, isPaused: false, consecutiveItemFailures: 0, escalated: false };
}

function getRetryDelayMs(): number {
  return RETRY_CONFIG.retryDelayMs;
}

function createSendFailure(
  overrides: Partial<SendFailure> & { error?: string; phoneNumber?: string }
): SendFailure {
  if (overrides.error) {
    return classifyFailure(overrides.error, overrides.phoneNumber);
  }
  return {
    category: FailureCategory.UNKNOWN,
    message: "test failure",
    retryable: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("failure-simulation", () => {
  describe("processItem", () => {
    it("retries retryable failures up to MAX_RETRIES times then marks as failed", () => {
      const failure = createSendFailure({ category: FailureCategory.DOM_NOT_FOUND, retryable: true });
      let state = createInitialSimulationState();

      for (let i = 0; i < MAX_RETRIES; i++) {
        const result = processItem(failure, state);
        expect(result.outcome).toBe("retried");
        state = result.newState;
      }

      const result = processItem(failure, state);
      expect(result.outcome).toBe("failed");
      expect(result.newState.retriesUsed).toBe(MAX_RETRIES);
    });

    it("skips retry for non-retryable failures immediately", () => {
      const failure = createSendFailure({ category: FailureCategory.INVALID_NUMBER, retryable: false });
      const state = createInitialSimulationState();
      const result = processItem(failure, state);
      expect(result.outcome).toBe("failed");
      expect(result.newState.retriesUsed).toBe(0);
    });
  });

  describe("simulateBatch", () => {
    it("handles mixed retryable and non-retryable failures", () => {
      const failures = [
        createSendFailure({ category: FailureCategory.INVALID_NUMBER, retryable: false }),
        createSendFailure({ category: FailureCategory.DOM_NOT_FOUND, retryable: true }),
        createSendFailure({ category: FailureCategory.SEND_TIMEOUT, retryable: true }),
      ];
      const result = simulateBatch(failures, createInitialSimulationState());
      expect(result.outcomes[0]).toBe("failed");
      expect(result.outcomes[1]).toBe("retried");
      expect(result.outcomes[2]).toBe("retried");
    });

    it("exhausts retries after MAX_RETRIES attempts", () => {
      const failure = createSendFailure({ category: FailureCategory.DOM_NOT_FOUND, retryable: true });
      let state = createInitialSimulationState();

      for (let i = 0; i < MAX_RETRIES; i++) {
        const result = processItem(failure, state);
        state = result.newState;
      }

      const second = createSendFailure({ category: FailureCategory.DOM_NOT_FOUND, retryable: true });
      const third = createSendFailure({ category: FailureCategory.DOM_NOT_FOUND, retryable: true });
      const failures = [second, third];
      const result = simulateBatch(failures, state);
      expect(result.outcomes).toEqual(["failed", "failed"]);
    });
  });

  describe("RETRY_CONFIG", () => {
    it("has retry delay of 3000ms", () => {
      expect(getRetryDelayMs()).toBe(3000);
    });
  });

  describe("escalation", () => {
    it("pauses session after ESCALATION_THRESHOLD consecutive permanently-failed items", () => {
      const nonRetryable = createSendFailure({ category: FailureCategory.INVALID_NUMBER, retryable: false });
      let state = createInitialSimulationState();

      const r1 = processItem(nonRetryable, state);
      expect(r1.outcome).toBe("failed");
      state = r1.newState;

      const r2 = processItem(nonRetryable, state);
      expect(r2.outcome).toBe("failed");
      state = r2.newState;

      const r3 = processItem(nonRetryable, state);
      expect(r3.outcome).toBe("escalated");
      expect(r3.newState.isPaused).toBe(true);
    });

    it("resets consecutive count after a retryable item retries successfully", () => {
      const nonRetryable = createSendFailure({ category: FailureCategory.INVALID_NUMBER, retryable: false });
      const retryable = createSendFailure({ category: FailureCategory.DOM_NOT_FOUND, retryable: true });
      let state = createInitialSimulationState();

      state = processItem(nonRetryable, state).newState;
      state = processItem(nonRetryable, state).newState;

      const retryResult = processItem(retryable, state);
      expect(retryResult.outcome).toBe("retried");
      expect(retryResult.newState.consecutiveItemFailures).toBe(0);
    });
  });

  describe("recovery", () => {
    it("paused session can be detected for recovery", () => {
      const state: FailureSimulationState = { ...createInitialSimulationState(), isPaused: true };
      expect(canAttemptRecovery(state)).toBe(true);
    });

    it("non-paused session does not need recovery", () => {
      expect(canAttemptRecovery(createInitialSimulationState())).toBe(false);
    });

    it("recovery resets consecutive failures and unpauses", () => {
      const state: FailureSimulationState = {
        ...createInitialSimulationState(),
        isPaused: true,
        consecutiveItemFailures: 3,
      };
      const recovered = recoverSession(state);
      expect(recovered.isPaused).toBe(false);
      expect(recovered.consecutiveItemFailures).toBe(0);
    });

    it("retryable items can be retried after recovery", () => {
      const nonRetryable = createSendFailure({ category: FailureCategory.INVALID_NUMBER, retryable: false });
      let state = createInitialSimulationState();

      for (let i = 0; i < ESCALATION_THRESHOLD; i++) {
        const result = processItem(nonRetryable, state);
        state = result.newState;
      }
      expect(state.isPaused).toBe(true);

      state = recoverSession(state);
      const retryable = createSendFailure({ category: FailureCategory.DOM_NOT_FOUND, retryable: true });
      const result = processItem(retryable, state);
      expect(result.outcome).toBe("retried");
    });

    it("non-retryable failures do not trigger escalation individually", () => {
      const failure = createSendFailure({ category: FailureCategory.INVALID_NUMBER, retryable: false });
      let state = createInitialSimulationState();
      const r1 = processItem(failure, state);
      expect(r1.outcome).toBe("failed");
      state = r1.newState;
      const r2 = processItem(failure, state);
      expect(r2.outcome).toBe("failed");
      state = r2.newState;
      expect(state.isPaused).toBe(false);
    });
  });

  describe("classifyFailure specific scenarios", () => {
    it("classifies tab closed as non-retryable", () => {
      const result = classifyFailure("tab was closed unexpectedly");
      expect(result.category).toBe(FailureCategory.TAB_CLOSED);
      expect(result.retryable).toBe(false);
    });

    it("classifies whatsapp disconnected as non-retryable", () => {
      const result = classifyFailure("Disconnected from WhatsApp Web");
      expect(result.category).toBe(FailureCategory.WHATSAPP_DISCONNECTED);
      expect(result.retryable).toBe(false);
    });

    it("classifies explicit tab close message as TAB_CLOSED", () => {
      const result = classifyFailure("the tab closed before message could be sent");
      expect(result.category).toBe(FailureCategory.TAB_CLOSED);
    });

    it("classifies 'not connected' as WHATSAPP_DISCONNECTED", () => {
      const result = classifyFailure("WhatsApp is not connected");
      expect(result.category).toBe(FailureCategory.WHATSAPP_DISCONNECTED);
    });
  });
});
