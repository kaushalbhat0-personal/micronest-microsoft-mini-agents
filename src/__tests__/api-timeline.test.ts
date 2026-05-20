import { describe, it, expect, beforeEach } from "vitest";

interface TestEvent {
  id: string;
  user_id: string;
  contact_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface TestUser {
  id: string;
  email: string;
}

function createStore() {
  const events = new Map<string, TestEvent>();
  const tokens = new Map<string, TestUser>();
  let eventIdCounter = 0;

  return {
    addToken(token: string, user: TestUser) {
      tokens.set(token, user);
    },
    clear() {
      events.clear();
      tokens.clear();
      eventIdCounter = 0;
    },
    validateAuth(headers: Record<string, string>): { user: TestUser } | null {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.slice(7);
      if (!token) return null;
      const user = tokens.get(token);
      if (!user) return null;
      return { user };
    },
    addEvent(e: TestEvent) {
      events.set(e.id, { ...e });
    },
    getEvents(contactId: string, userId: string) {
      return Array.from(events.values())
        .filter((e) => e.contact_id === contactId && e.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    createEvent(userId: string, contactId: string, eventType: string, metadata: Record<string, unknown>) {
      eventIdCounter++;
      const ev: TestEvent = {
        id: `evt-${eventIdCounter}`,
        user_id: userId,
        contact_id: contactId,
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString(),
      };
      events.set(ev.id, ev);
      return ev;
    },
  };
}

function handleTimelineGet(
  contactId: string | undefined,
  headers: Record<string, string>,
  store: ReturnType<typeof createStore>
): { status: number; body: unknown } {
  const auth = store.validateAuth(headers);
  if (!auth) return { status: 401, body: { error: "Unauthorized" } };

  if (!contactId) {
    return { status: 400, body: { error: "contactId is required" } };
  }

  const result = store.getEvents(contactId, auth.user.id);
  return { status: 200, body: { events: result } };
}

const user: TestUser = { id: "user-1", email: "test@test.com" };
const token = "valid-token";

function baseHeaders(): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function makeEvent(id: string, overrides: Partial<TestEvent> = {}): TestEvent {
  return {
    id,
    user_id: user.id,
    contact_id: "contact-1",
    event_type: "note_added",
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("api timeline", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.clear();
    store.addToken(token, user);
  });

  describe("GET", () => {
    it("returns timeline events for a contact", () => {
      store.addEvent(makeEvent("evt-1", { contact_id: "contact-1", event_type: "note_added", metadata: { note: "Hello" } }));
      store.addEvent(makeEvent("evt-2", { contact_id: "contact-1", event_type: "status_changed", metadata: { from: "pending", to: "contacted" } }));

      const res = handleTimelineGet("contact-1", baseHeaders(), store);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      const evts = body.events as TestEvent[];
      expect(evts).toHaveLength(2);
    });

    it("returns 200 with empty array when no events", () => {
      const res = handleTimelineGet("contact-1", baseHeaders(), store);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ events: [] });
    });

    it("returns 400 for missing contactId", () => {
      const res = handleTimelineGet(undefined, baseHeaders(), store);
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", () => {
      const res = handleTimelineGet("contact-1", {}, store);
      expect(res.status).toBe(401);
    });

    it("events are ordered by created_at descending", () => {
      const old = makeEvent("evt-old", { created_at: "2026-01-01T00:00:00Z" });
      const mid = makeEvent("evt-mid", { created_at: "2026-01-02T00:00:00Z" });
      const latest = makeEvent("evt-latest", { created_at: "2026-01-03T00:00:00Z" });
      store.addEvent(old);
      store.addEvent(mid);
      store.addEvent(latest);

      const res = handleTimelineGet("contact-1", baseHeaders(), store);
      const body = res.body as Record<string, unknown>;
      const evts = body.events as TestEvent[];
      expect(evts[0].id).toBe("evt-latest");
      expect(evts[1].id).toBe("evt-mid");
      expect(evts[2].id).toBe("evt-old");
    });

    it("each event has contact_id, event_type, metadata, created_at", () => {
      store.addEvent(makeEvent("evt-1", {
        contact_id: "contact-1",
        event_type: "note_added",
        metadata: { source: "test" },
        created_at: "2026-01-01T00:00:00Z",
      }));

      const res = handleTimelineGet("contact-1", baseHeaders(), store);
      const body = res.body as Record<string, unknown>;
      const evts = body.events as TestEvent[];
      const evt = evts[0];
      expect(evt).toHaveProperty("contact_id", "contact-1");
      expect(evt).toHaveProperty("event_type", "note_added");
      expect(evt).toHaveProperty("metadata");
      expect(evt).toHaveProperty("created_at");
    });
  });
});
