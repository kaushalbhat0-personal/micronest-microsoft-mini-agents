import type { PersistedSession } from "./storage";
import type { SendFailure } from "./failure-types";

interface ReplayEvent {
  timestamp: number;
  type: "transition" | "message" | "failure" | "recovery" | "lock" | "state_change";
  data: Record<string, unknown>;
}

const MAX_REPLAY_EVENTS = 1000;
const replayBuffer: ReplayEvent[] = [];

export function recordReplayEvent(
  type: ReplayEvent["type"],
  data: Record<string, unknown>
): void {
  replayBuffer.push({ timestamp: Date.now(), type, data });
  if (replayBuffer.length > MAX_REPLAY_EVENTS) replayBuffer.shift();
}

export function getReplayTimeline(): ReplayEvent[] {
  return [...replayBuffer];
}

export function getReplayByType(type: ReplayEvent["type"]): ReplayEvent[] {
  return replayBuffer.filter((e) => e.type === type);
}

export function clearReplay(): void {
  replayBuffer.length = 0;
}

export function buildReplaySummary(): string {
  return JSON.stringify(replayBuffer.slice(-50), null, 2);
}
