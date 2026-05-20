import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

interface SessionContact {
  candidateId: string;
  contactId: string;
  phoneNumber: string;
  customerName: string;
  message: string;
}

interface SessionState {
  id: string;
  contacts: SessionContact[];
  currentIndex: number;
  state: "queued" | "sending" | "paused" | "completed" | "stopped" | "failed";
  counters: { sent: number; skipped: number; failed: number; retries: number };
  timerId?: ReturnType<typeof setTimeout>;
  intervalId?: ReturnType<typeof setInterval>;
  failedContacts: Array<{
    category: string;
    message: string;
    retryable: boolean;
    timestamp: number;
    contactIndex?: number;
    candidateId?: string;
    contactId?: string;
  }>;
  retryCount: number;
}

function formatSessionForPopup(session: SessionState) {
  const contact = session.contacts[session.currentIndex];
  return {
    id: session.id,
    state: session.state,
    currentIndex: session.currentIndex,
    totalCount: session.contacts.length,
    currentContactName: contact?.customerName ?? "",
    counters: { ...session.counters },
    delayRemainingMs: 0,
  };
}

function handleMessage(
  message: { type: string; payload?: Record<string, unknown> },
  sessions: Map<string, SessionState>
): Record<string, unknown> {
  switch (message.type) {
    case "START_SEQUENCE": {
      const payload = message.payload as {
        sessionId: string;
        contacts: SessionContact[];
      };

      if (sessions.has(payload.sessionId)) {
        return { success: false, error: "Session already exists" };
      }

      const session: SessionState = {
        id: payload.sessionId,
        contacts: payload.contacts,
        currentIndex: 0,
        state: "sending",
        counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
        failedContacts: [],
        retryCount: 0,
      };

      sessions.set(payload.sessionId, session);
      return { success: true };
    }

    case "PAUSE_SEQUENCE": {
      const session = sessions.get((message.payload as { sessionId: string })?.sessionId);
      if (session) {
        session.state = "paused";
        if (session.timerId) clearTimeout(session.timerId);
        if (session.intervalId) clearInterval(session.intervalId);
        session.timerId = undefined;
        session.intervalId = undefined;
      }
      return { success: !!session };
    }

    case "RESUME_SEQUENCE": {
      const session = sessions.get((message.payload as { sessionId: string })?.sessionId);
      if (session && session.state === "paused") {
        session.state = "sending";
      }
      return { success: !!session };
    }

    case "STOP_SEQUENCE": {
      const sessionId = (message.payload as { sessionId: string })?.sessionId;
      const session = sessions.get(sessionId);
      if (session) {
        session.state = "stopped";
        if (session.timerId) clearTimeout(session.timerId);
        if (session.intervalId) clearInterval(session.intervalId);
        session.timerId = undefined;
        session.intervalId = undefined;
        sessions.delete(sessionId);
      }
      return { success: !!session };
    }

    case "SKIP_CURRENT": {
      const session = sessions.get((message.payload as { sessionId: string })?.sessionId);
      if (session) {
        session.counters.skipped++;
        session.retryCount = 0;
        if (session.timerId) clearTimeout(session.timerId);
        if (session.intervalId) clearInterval(session.intervalId);
        session.timerId = undefined;
        session.intervalId = undefined;
        session.currentIndex++;

        if (session.currentIndex >= session.contacts.length) {
          session.state = "completed";
          sessions.delete(session.id);
        }
      }
      return { success: !!session };
    }

    case "EDIT_MESSAGE": {
      const { sessionId, index, msg } = message.payload as {
        sessionId: string;
        index: number;
        msg: string;
      };
      const session = sessions.get(sessionId);
      if (session && session.contacts[index]) {
        session.contacts[index].message = msg;
      }
      return { success: !!session };
    }

    case "GET_SESSION_STATUS": {
      const sessionId = (message.payload as { sessionId?: string })?.sessionId;
      if (sessionId) {
        const session = sessions.get(sessionId);
        return { session: session ? formatSessionForPopup(session) : null };
      }
      const allSessions = Array.from(sessions.values()).map(formatSessionForPopup);
      return { sessions: allSessions };
    }

    case "GET_RECOVERY_STATUS": {
      const session = sessions.values().next().value;
      return {
        hasRecoveredSession: !!session,
        session: session ? formatSessionForPopup(session) : null,
        whatsappConnected: true,
      };
    }

    case "DISCARD_RECOVERED_SESSION": {
      const sessionId = (message.payload as { sessionId?: string })?.sessionId;
      if (sessionId) {
        sessions.delete(sessionId);
      } else {
        sessions.clear();
      }
      return { success: true };
    }

    case "GET_HEARTBEAT":
      return { timestamp: Date.now(), isStale: false };

    case "OPEN_SIDE_PANEL":
      return { success: true };

    default:
      return { error: "Unknown message type" };
  }
}

function makeContact(overrides?: Partial<SessionContact>): SessionContact {
  return {
    candidateId: "cand-1",
    contactId: "cont-1",
    phoneNumber: "15551234567",
    customerName: "Alice",
    message: "Hello Alice",
    ...overrides,
  };
}

function makeContacts(count: number): SessionContact[] {
  return Array.from({ length: count }, (_, i) =>
    makeContact({
      candidateId: `cand-${i + 1}`,
      contactId: `cont-${i + 1}`,
      customerName: `User ${i + 1}`,
      phoneNumber: `1555000${String(i + 1).padStart(4, "0")}`,
      message: `Message ${i + 1}`,
    })
  );
}

describe("extension-runtime message handlers", () => {
  let sessions: Map<string, SessionState>;

  beforeEach(() => {
    sessions = new Map();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("START_SEQUENCE", () => {
    it("creates a new session and returns success", () => {
      const contacts = makeContacts(2);
      const result = handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "session-1", contacts } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.size).toBe(1);
      const session = sessions.get("session-1")!;
      expect(session.state).toBe("sending");
      expect(session.currentIndex).toBe(0);
      expect(session.counters).toEqual({ sent: 0, skipped: 0, failed: 0, retries: 0 });
      expect(session.contacts).toHaveLength(2);
    });

    it("returns error when session id already exists", () => {
      const contacts = makeContacts(1);
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "dup", contacts } },
        sessions
      );
      const result = handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "dup", contacts } },
        sessions
      );

      expect(result).toEqual({ success: false, error: "Session already exists" });
      expect(sessions.size).toBe(1);
    });

    it("initializes counters to zero", () => {
      const result = handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(3) } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.get("s1")!.counters).toEqual({ sent: 0, skipped: 0, failed: 0, retries: 0 });
    });

    it("initializes failedContacts as empty array", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(1) } },
        sessions
      );

      expect(sessions.get("s1")!.failedContacts).toEqual([]);
    });
  });

  describe("PAUSE_SEQUENCE", () => {
    it("pauses an active session", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      const result = handleMessage(
        { type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.get("s1")!.state).toBe("paused");
    });

    it("clears timerId and intervalId on pause", () => {
      const session: SessionState = {
        id: "s1",
        contacts: makeContacts(2),
        currentIndex: 0,
        state: "sending",
        counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
        failedContacts: [],
        retryCount: 0,
        timerId: setTimeout(() => {}, 1000),
        intervalId: setInterval(() => {}, 1000),
      };
      sessions.set("s1", session);

      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.timerId).toBeUndefined();
      expect(sessions.get("s1")!.intervalId).toBeUndefined();
    });

    it("returns success false for non-existent session", () => {
      const result = handleMessage(
        { type: "PAUSE_SEQUENCE", payload: { sessionId: "ghost" } },
        sessions
      );

      expect(result).toEqual({ success: false });
    });
  });

  describe("RESUME_SEQUENCE", () => {
    it("resumes a paused session", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);
      const result = handleMessage(
        { type: "RESUME_SEQUENCE", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.get("s1")!.state).toBe("sending");
    });

    it("does not resume a non-paused session", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      const result = handleMessage(
        { type: "RESUME_SEQUENCE", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.get("s1")!.state).toBe("sending");
    });

    it("returns success false for non-existent session", () => {
      const result = handleMessage(
        { type: "RESUME_SEQUENCE", payload: { sessionId: "ghost" } },
        sessions
      );

      expect(result).toEqual({ success: false });
    });
  });

  describe("STOP_SEQUENCE", () => {
    it("stops an active session and removes it", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      const result = handleMessage(
        { type: "STOP_SEQUENCE", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.has("s1")).toBe(false);
    });

    it("stops a paused session and removes it", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);
      const result = handleMessage(
        { type: "STOP_SEQUENCE", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.has("s1")).toBe(false);
    });

    it("clears timerId and intervalId on stop", () => {
      const session: SessionState = {
        id: "s1",
        contacts: makeContacts(2),
        currentIndex: 0,
        state: "sending",
        counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
        failedContacts: [],
        retryCount: 0,
        timerId: setTimeout(() => {}, 1000),
        intervalId: setInterval(() => {}, 1000),
      };
      sessions.set("s1", session);

      handleMessage({ type: "STOP_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.has("s1")).toBe(false);
    });

    it("returns success false for non-existent session", () => {
      const result = handleMessage(
        { type: "STOP_SEQUENCE", payload: { sessionId: "ghost" } },
        sessions
      );

      expect(result).toEqual({ success: false });
    });
  });

  describe("SKIP_CURRENT", () => {
    it("skips current contact and advances index", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(3) } },
        sessions
      );
      const result = handleMessage(
        { type: "SKIP_CURRENT", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.get("s1")!.currentIndex).toBe(1);
      expect(sessions.get("s1")!.counters.skipped).toBe(1);
    });

    it("increments skipped counter on each skip", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(3) } },
        sessions
      );
      handleMessage({ type: "SKIP_CURRENT", payload: { sessionId: "s1" } }, sessions);
      handleMessage({ type: "SKIP_CURRENT", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.counters.skipped).toBe(2);
      expect(sessions.get("s1")!.currentIndex).toBe(2);
    });

    it("completes session when skipping last contact", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "SKIP_CURRENT", payload: { sessionId: "s1" } }, sessions);
      const result = handleMessage(
        { type: "SKIP_CURRENT", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.has("s1")).toBe(false);
    });

    it("clears timerId and intervalId on skip", () => {
      const session: SessionState = {
        id: "s1",
        contacts: makeContacts(2),
        currentIndex: 0,
        state: "sending",
        counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
        failedContacts: [],
        retryCount: 0,
        timerId: setTimeout(() => {}, 1000),
        intervalId: setInterval(() => {}, 1000),
      };
      sessions.set("s1", session);

      handleMessage({ type: "SKIP_CURRENT", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.currentIndex).toBe(1);
      expect(sessions.get("s1")!.timerId).toBeUndefined();
      expect(sessions.get("s1")!.intervalId).toBeUndefined();
    });

    it("returns success false for non-existent session", () => {
      const result = handleMessage(
        { type: "SKIP_CURRENT", payload: { sessionId: "ghost" } },
        sessions
      );

      expect(result).toEqual({ success: false });
    });
  });

  describe("EDIT_MESSAGE", () => {
    it("updates message at the given index", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(3) } },
        sessions
      );
      const result = handleMessage(
        {
          type: "EDIT_MESSAGE",
          payload: { sessionId: "s1", index: 1, msg: "Updated message" },
        },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.get("s1")!.contacts[1].message).toBe("Updated message");
    });

    it("does not affect other contacts", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(3) } },
        sessions
      );
      handleMessage(
        {
          type: "EDIT_MESSAGE",
          payload: { sessionId: "s1", index: 0, msg: "New text" },
        },
        sessions
      );

      expect(sessions.get("s1")!.contacts[0].message).toBe("New text");
      expect(sessions.get("s1")!.contacts[1].message).toBe("Message 2");
      expect(sessions.get("s1")!.contacts[2].message).toBe("Message 3");
    });

    it("returns success false for non-existent index", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      const result = handleMessage(
        {
          type: "EDIT_MESSAGE",
          payload: { sessionId: "s1", index: 99, msg: "test" },
        },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.get("s1")!.contacts.length).toBe(2);
    });

    it("returns success false for non-existent session", () => {
      const result = handleMessage(
        {
          type: "EDIT_MESSAGE",
          payload: { sessionId: "ghost", index: 0, msg: "test" },
        },
        sessions
      );

      expect(result).toEqual({ success: false });
    });
  });

  describe("GET_SESSION_STATUS", () => {
    it("returns formatted session data for a specific session", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      const result = handleMessage(
        { type: "GET_SESSION_STATUS", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result.session).toBeDefined();
      expect(result.session!.id).toBe("s1");
      expect(result.session!.state).toBe("sending");
      expect(result.session!.currentIndex).toBe(0);
      expect(result.session!.totalCount).toBe(2);
      expect(result.session!.currentContactName).toBe("User 1");
      expect(result.session!.counters).toEqual({ sent: 0, skipped: 0, failed: 0, retries: 0 });
    });

    it("returns null when specific session does not exist", () => {
      const result = handleMessage(
        { type: "GET_SESSION_STATUS", payload: { sessionId: "ghost" } },
        sessions
      );

      expect(result.session).toBeNull();
    });

    it("returns all sessions when no sessionId provided", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(1) } },
        sessions
      );
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s2", contacts: makeContacts(2) } },
        sessions
      );
      const result = handleMessage({ type: "GET_SESSION_STATUS", payload: {} }, sessions);

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions![0].id).toBe("s1");
      expect(result.sessions![1].id).toBe("s2");
    });

    it("returns empty array when no payload provided", () => {
      const result = handleMessage({ type: "GET_SESSION_STATUS", payload: {} }, sessions);

      expect(result.sessions).toEqual([]);
    });

    it("includes currentContactName from current index", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(3) } },
        sessions
      );
      handleMessage({ type: "SKIP_CURRENT", payload: { sessionId: "s1" } }, sessions);

      const result = handleMessage(
        { type: "GET_SESSION_STATUS", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result.session!.currentIndex).toBe(1);
      expect(result.session!.currentContactName).toBe("User 2");
    });

    it("returns empty currentContactName when no contacts", () => {
      const session: SessionState = {
        id: "empty",
        contacts: [],
        currentIndex: 0,
        state: "sending",
        counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
        failedContacts: [],
        retryCount: 0,
      };
      sessions.set("empty", session);

      const result = handleMessage(
        { type: "GET_SESSION_STATUS", payload: { sessionId: "empty" } },
        sessions
      );

      expect(result.session!.currentContactName).toBe("");
    });
  });

  describe("GET_RECOVERY_STATUS", () => {
    it("returns hasRecoveredSession false when no sessions", () => {
      const result = handleMessage({ type: "GET_RECOVERY_STATUS", payload: {} }, sessions);

      expect(result.hasRecoveredSession).toBe(false);
      expect(result.session).toBeNull();
    });

    it("returns session info when session exists", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      const result = handleMessage({ type: "GET_RECOVERY_STATUS", payload: {} }, sessions);

      expect(result.hasRecoveredSession).toBe(true);
      expect(result.session!.id).toBe("s1");
      expect(result.whatsappConnected).toBe(true);
    });
  });

  describe("DISCARD_RECOVERED_SESSION", () => {
    it("clears a specific session by id", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(1) } },
        sessions
      );
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s2", contacts: makeContacts(1) } },
        sessions
      );
      const result = handleMessage(
        { type: "DISCARD_RECOVERED_SESSION", payload: { sessionId: "s1" } },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.has("s1")).toBe(false);
      expect(sessions.has("s2")).toBe(true);
    });

    it("clears all sessions when no sessionId specified", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(1) } },
        sessions
      );
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s2", contacts: makeContacts(1) } },
        sessions
      );
      const result = handleMessage(
        { type: "DISCARD_RECOVERED_SESSION", payload: {} },
        sessions
      );

      expect(result).toEqual({ success: true });
      expect(sessions.size).toBe(0);
    });
  });

  describe("GET_HEARTBEAT", () => {
    it("returns timestamp and isStale false", () => {
      const result = handleMessage({ type: "GET_HEARTBEAT", payload: {} }, sessions);

      expect(result).toHaveProperty("timestamp");
      expect(result.isStale).toBe(false);
    });

    it("returns a recent timestamp", () => {
      const before = Date.now();
      const result = handleMessage({ type: "GET_HEARTBEAT", payload: {} }, sessions);
      const after = Date.now();

      expect((result.timestamp as number)).toBeGreaterThanOrEqual(before);
      expect((result.timestamp as number)).toBeLessThanOrEqual(after);
    });
  });

  describe("OPEN_SIDE_PANEL", () => {
    it("returns success", () => {
      const result = handleMessage({ type: "OPEN_SIDE_PANEL", payload: {} }, sessions);

      expect(result).toEqual({ success: true });
    });
  });

  describe("unknown message type", () => {
    it("returns error for unknown message type", () => {
      const result = handleMessage({ type: "UNKNOWN_TYPE", payload: {} }, sessions);

      expect(result).toEqual({ error: "Unknown message type" });
    });

    it("returns error for random string type", () => {
      const result = handleMessage({ type: "FOOBAR", payload: {} }, sessions);

      expect(result).toEqual({ error: "Unknown message type" });
    });
  });

  describe("session state transitions", () => {
    it("starts in sending state", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(1) } },
        sessions
      );

      expect(sessions.get("s1")!.state).toBe("sending");
    });

    it("transitions sending -> paused on pause", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.state).toBe("paused");
    });

    it("transitions paused -> sending on resume", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);
      handleMessage({ type: "RESUME_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.state).toBe("sending");
    });

    it("removes session on stop", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "STOP_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.has("s1")).toBe(false);
    });

    it("completes and removes session when all contacts skipped", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "SKIP_CURRENT", payload: { sessionId: "s1" } }, sessions);
      handleMessage({ type: "SKIP_CURRENT", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.has("s1")).toBe(false);
    });
  });

  describe("multiple sessions", () => {
    it("handles independent sessions simultaneously", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(1) } },
        sessions
      );
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s2", contacts: makeContacts(1) } },
        sessions
      );

      expect(sessions.size).toBe(2);
      expect(sessions.get("s1")!.state).toBe("sending");
      expect(sessions.get("s2")!.state).toBe("sending");
    });

    it("pausing one session does not affect the other", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(1) } },
        sessions
      );
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s2", contacts: makeContacts(1) } },
        sessions
      );
      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.state).toBe("paused");
      expect(sessions.get("s2")!.state).toBe("sending");
    });
  });

  describe("edge cases", () => {
    it("handles empty contacts list", () => {
      const result = handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: [] } },
        sessions
      );

      expect(result).toEqual({ success: true });
      const session = sessions.get("s1")!;
      expect(session.contacts).toHaveLength(0);
      expect(session.currentIndex).toBe(0);
    });

    it("resume on a session that was never paused keeps it sending", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "RESUME_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.state).toBe("sending");
    });

    it("pause on already paused session keeps paused", () => {
      handleMessage(
        { type: "START_SEQUENCE", payload: { sessionId: "s1", contacts: makeContacts(2) } },
        sessions
      );
      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);
      handleMessage({ type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } }, sessions);

      expect(sessions.get("s1")!.state).toBe("paused");
    });
  });
});
