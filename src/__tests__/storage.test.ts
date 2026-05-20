import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  persistSession,
  loadSession,
  clearSession,
  persistHeartbeat,
  loadHeartbeat,
  pushSessionHistory,
} from "@extension/shared/storage";
import type { PersistedSession } from "@extension/shared/storage";

function createTestSession(overrides: Partial<PersistedSession> = {}): PersistedSession {
  return {
    id: "test-session-1",
    contacts: [
      { candidateId: "c1", contactId: "ct1", phoneNumber: "12025550199", customerName: "Alice", message: "Hello" },
    ],
    currentIndex: 0,
    state: "sending",
    counters: { sent: 1, skipped: 0, failed: 0, retries: 0 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    failedContacts: [],
    heartbeatTimestamps: [Date.now()],
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("persistSession", () => {
    it("calls chrome.storage.local.set with session data", async () => {
      const session = createTestSession();
      const setMock = vi.mocked(chrome.storage.local.set);

      await persistSession(session);

      expect(setMock).toHaveBeenCalledOnce();
      const [[data]] = setMock.mock.calls;
      expect(data).toHaveProperty("micronest_active_session");
      expect(data.micronest_active_session.id).toBe("test-session-1");
      expect(data.micronest_active_session.state).toBe("sending");
    });

    it("updates updatedAt timestamp before saving", async () => {
      const session = createTestSession({ updatedAt: 0 });
      const before = Date.now();

      await persistSession(session);

      expect(session.updatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe("loadSession", () => {
    it("returns parsed session data from storage", async () => {
      const session = createTestSession();
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        micronest_active_session: session,
      });

      const result = await loadSession();

      expect(result).toEqual(session);
    });

    it("returns null when no session is stored", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const result = await loadSession();

      expect(result).toBeNull();
    });

    it("returns null when stored value is not an object", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        micronest_active_session: null,
      });

      const result = await loadSession();

      expect(result).toBeNull();
    });
  });

  describe("clearSession", () => {
    it("removes session from storage", async () => {
      const removeMock = vi.mocked(chrome.storage.local.remove);

      await clearSession();

      expect(removeMock).toHaveBeenCalledWith("micronest_active_session");
    });
  });

  describe("persistHeartbeat", () => {
    it("stores heartbeat data", async () => {
      const heartbeat = { lastHeartbeat: Date.now(), whatsappTabId: 123, currentIndex: 0, sessionId: "s1" };
      const setMock = vi.mocked(chrome.storage.local.set);

      await persistHeartbeat(heartbeat);

      expect(setMock).toHaveBeenCalledWith({
        micronest_heartbeat: heartbeat,
      });
    });
  });

  describe("loadHeartbeat", () => {
    it("returns stored heartbeat", async () => {
      const hb = { lastHeartbeat: Date.now(), whatsappTabId: 123, currentIndex: 0, sessionId: "s1" };
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ micronest_heartbeat: hb });

      const result = await loadHeartbeat();

      expect(result).toEqual(hb);
    });

    it("returns null when no heartbeat stored", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const result = await loadHeartbeat();

      expect(result).toBeNull();
    });
  });

  describe("pushSessionHistory", () => {
    it("appends session to history", async () => {
      const session = createTestSession();
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        micronest_session_history: [createTestSession({ id: "old" })],
      });
      const setMock = vi.mocked(chrome.storage.local.set);

      await pushSessionHistory(session);

      expect(setMock).toHaveBeenCalledOnce();
      const [[data]] = setMock.mock.calls;
      expect(data.micronest_session_history).toHaveLength(2);
      expect(data.micronest_session_history[1].id).toBe("test-session-1");
    });

    it("trims history to last 20 sessions", async () => {
      const oldSessions = Array.from({ length: 25 }, (_, i) => createTestSession({ id: `old-${i}` }));
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        micronest_session_history: oldSessions,
      });

      await pushSessionHistory(createTestSession());

      const [[data]] = vi.mocked(chrome.storage.local.set).mock.calls;
      expect(data.micronest_session_history.length).toBeLessThanOrEqual(20);
    });

    it("handles empty history", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      await pushSessionHistory(createTestSession());

      const [[data]] = vi.mocked(chrome.storage.local.set).mock.calls;
      expect(data.micronest_session_history).toHaveLength(1);
    });
  });
});
