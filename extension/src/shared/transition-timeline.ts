interface TransitionEvent {
  timestamp: number;
  from: string;
  to: string;
  sessionId: string;
  contactIndex?: number;
  failure?: { category: string; message: string; retryable: boolean };
  metadata?: Record<string, unknown>;
}

const MAX_EVENTS = 200;
const events: TransitionEvent[] = [];

export function recordTransition(
  from: string,
  to: string,
  sessionId: string,
  contactIndex?: number,
  failure?: TransitionEvent["failure"],
  metadata?: Record<string, unknown>
): void {
  events.push({ timestamp: Date.now(), from, to, sessionId, contactIndex, failure, metadata });
  if (events.length > MAX_EVENTS) events.shift();
}

export function getTransitions(count = 50): TransitionEvent[] {
  return events.slice(-count);
}

export function getTransitionsBySession(sessionId: string): TransitionEvent[] {
  return events.filter((e) => e.sessionId === sessionId);
}

export function clearTransitions(): void {
  events.length = 0;
}
