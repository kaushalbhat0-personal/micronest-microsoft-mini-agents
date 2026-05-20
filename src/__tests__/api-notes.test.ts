import { describe, it, expect, beforeEach } from "vitest";

interface TestNote {
  id: string;
  user_id: string;
  contact_id: string;
  note: string;
  created_at: string;
}

interface TestEvent {
  user_id: string;
  contact_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
}

interface TestUser {
  id: string;
  email: string;
}

interface TestContact {
  id: string;
  user_id: string;
  customer_name: string;
}

function createStore() {
  const notes = new Map<string, TestNote>();
  const events: TestEvent[] = [];
  const contacts = new Map<string, TestContact>();
  const tokens = new Map<string, TestUser>();
  let noteIdCounter = 0;

  return {
    addToken(token: string, user: TestUser) {
      tokens.set(token, user);
    },
    addContact(c: TestContact) {
      contacts.set(c.id, { ...c });
    },
    clear() {
      notes.clear();
      events.length = 0;
      contacts.clear();
      tokens.clear();
      noteIdCounter = 0;
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
    getNotes(contactId: string, userId: string) {
      return Array.from(notes.values())
        .filter((n) => n.contact_id === contactId && n.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    addNote(contactId: string, userId: string, noteText: string) {
      noteIdCounter++;
      const now = new Date();
      const note: TestNote = {
        id: `note-${noteIdCounter}`,
        user_id: userId,
        contact_id: contactId,
        note: noteText,
        created_at: now.toISOString(),
      };
      notes.set(note.id, note);
      return note;
    },
    addEvent(e: TestEvent) {
      events.push({ ...e });
    },
    getEvents() {
      return [...events];
    },
  };
}

function handleNotesGet(
  contactId: string | undefined,
  headers: Record<string, string>,
  store: ReturnType<typeof createStore>
): { status: number; body: unknown } {
  const auth = store.validateAuth(headers);
  if (!auth) return { status: 401, body: { error: "Unauthorized" } };

  if (!contactId) {
    return { status: 400, body: { error: "contactId is required" } };
  }

  const result = store.getNotes(contactId, auth.user.id);
  return { status: 200, body: { notes: result } };
}

function handleNotesPost(
  contactId: string | undefined,
  headers: Record<string, string>,
  body: unknown,
  store: ReturnType<typeof createStore>
): { status: number; body: unknown } {
  const auth = store.validateAuth(headers);
  if (!auth) return { status: 401, body: { error: "Unauthorized" } };

  if (!contactId) {
    return { status: 400, body: { error: "contactId is required" } };
  }

  const reqBody = body as Record<string, unknown> | undefined;
  const note = reqBody?.note;

  if (!note || typeof note !== "string" || !(note as string).trim()) {
    return { status: 400, body: { error: "note is required" } };
  }

  const created = store.addNote(contactId, auth.user.id, (note as string).trim());

  store.addEvent({
    user_id: auth.user.id,
    contact_id: contactId,
    event_type: "note_added",
    metadata: { note: (note as string).trim(), source: "extension_overlay" },
  });

  return { status: 200, body: { note: created } };
}

const user: TestUser = { id: "user-1", email: "alice@test.com" };
const token = "valid-token";

function baseHeaders(): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

describe("api notes", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.clear();
    store.addToken(token, user);
  });

  describe("GET", () => {
    it("returns notes for a given contactId", () => {
      store.addNote("contact-1", user.id, "First note");
      store.addNote("contact-1", user.id, "Second note");
      store.addNote("contact-2", user.id, "Other contact note");

      const res = handleNotesGet("contact-1", baseHeaders(), store);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      const notesResult = body.notes as TestNote[];
      expect(notesResult).toHaveLength(2);
    });

    it("returns 200 with empty array when no notes", () => {
      const res = handleNotesGet("contact-1", baseHeaders(), store);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ notes: [] });
    });

    it("returns 400 for missing contactId", () => {
      const res = handleNotesGet(undefined, baseHeaders(), store);
      expect(res.status).toBe(400);
    });

    it("returns 401 without auth", () => {
      const res = handleNotesGet("contact-1", {}, store);
      expect(res.status).toBe(401);
    });

    it("notes are ordered by created_at descending", () => {
      store.addNote("contact-1", user.id, "Old note");
      store.addNote("contact-1", user.id, "Mid note");
      store.addNote("contact-1", user.id, "New note");

      const res = handleNotesGet("contact-1", baseHeaders(), store);
      const body = res.body as Record<string, unknown>;
      const notesResult = body.notes as TestNote[];
      expect(notesResult.length).toBe(3);
      for (let i = 1; i < notesResult.length; i++) {
        expect(notesResult[i - 1].created_at >= notesResult[i].created_at).toBe(true);
      }
    });
  });

  describe("POST", () => {
    it("creates a new note", () => {
      const res = handleNotesPost("contact-1", baseHeaders(), { note: "Hello" }, store);
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      const note = body.note as TestNote;
      expect(note).toHaveProperty("id");
      expect(note.note).toBe("Hello");
      expect(note.contact_id).toBe("contact-1");
      expect(note.user_id).toBe(user.id);
    });

    it("returns 400 when note content is empty", () => {
      const res = handleNotesPost("contact-1", baseHeaders(), { note: "" }, store);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "note is required" });
    });

    it("returns 400 when note is missing", () => {
      const res = handleNotesPost("contact-1", baseHeaders(), {}, store);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "note is required" });
    });

    it("returns 400 when note is not a string", () => {
      const res = handleNotesPost("contact-1", baseHeaders(), { note: 123 }, store);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "note is required" });
    });

    it("creates a contact event when note is added", () => {
      handleNotesPost("contact-1", baseHeaders(), { note: "Test note" }, store);
      const events = store.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("note_added");
      expect(events[0].contact_id).toBe("contact-1");
      expect(events[0].user_id).toBe(user.id);
      expect(events[0].metadata).toEqual({
        note: "Test note",
        source: "extension_overlay",
      });
    });

    it("returns 401 without auth", () => {
      const res = handleNotesPost("contact-1", {}, { note: "test" }, store);
      expect(res.status).toBe(401);
    });
  });
});
